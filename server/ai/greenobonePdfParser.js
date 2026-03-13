// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Greenbone PDF-Parser: PDF-Text-Extraktion → Finding-Array
// Primär: Regex-Parsing des standardisierten Greenbone-Report-Formats
// Fallback: Ollama LLM wenn Regex keine Treffer liefert
'use strict'

const pdfParse = require('pdf-parse')
const http     = require('http')

const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'localhost'
const OLLAMA_PORT  = parseInt(process.env.OLLAMA_PORT || '11434')
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b'

/**
 * Parst einen Greenbone PDF-Report-Buffer.
 * Gibt dasselbe Finding-Array-Format wie greenboneXmlParser zurück.
 */
async function parsePdf(buffer) {
  const data = await pdfParse(buffer)
  const text = data.text

  // Erst Regex-Parsing versuchen (schnell, kein LLM nötig)
  const findings = regexParseFindigs(text)
  if (findings.length > 0) return findings

  // Fallback: Ollama
  return ollamaParseFindigs(text)
}

// ── Regex-Parser (Greenbone-Standard-Layout) ─────────────────────────────────
// Erkennt Blöcke die mit einem NVT-Titel + "Severity: X.X (High/Medium/Low)" beginnen

function regexParseFindigs(text) {
  const findings = []

  // Block-Erkennung: Titel-Zeile direkt über "Severity: 8.8 (High)"
  // Greenbone-Format: NVT-Name\nHostname: ...\nProtocol: ...\nSeverity: 8.8 (High)
  const blockRe = /^(.+?)\nHostname:\s*(.+?)\n(?:Protocol:[^\n]*\n)?(?:Port:[^\n]*\n)?(?:OID:[^\n]*\n)?Severity:\s*([\d.]+)\s*\((\w+)\)([\s\S]*?)(?=\n\S.*?\nHostname:|\nQuality of Detection|\z)/gm

  let m
  while ((m = blockRe.exec(text)) !== null) {
    const [, name, host, cvssStr, severityLabel, body] = m
    const cvss = parseFloat(cvssStr) || 0
    if (cvss <= 0) continue

    findings.push({
      nvtOid:          extractField(body, 'OID') || '',
      nvtName:         name.trim(),
      severity:        severityLabel.toLowerCase(),
      cvssScore:       cvss,
      cveIds:          extractCves(body),
      host:            host.trim(),
      port:            extractField(body, 'Port') || '',
      summary:         extractSection(body, 'Summary'),
      solution:        extractSection(body, 'Solution'),
      solutionType:    extractField(body, 'Solution type') || '',
      insight:         extractSection(body, 'Vulnerability Insight'),
      affected:        extractSection(body, 'Affected Software'),
      detectionResult: extractSection(body, 'Vulnerability Detection Result')
    })
  }

  // Einfacherer Fallback-Regex wenn obiger nichts findet
  if (findings.length === 0) {
    const simpleRe = /Severity:\s*([\d.]+)\s*\((High|Medium|Low|Critical)\)/g
    const nameRe   = /^(.+)\nSeverity:/m

    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const sm = /Severity:\s*([\d.]+)\s*\((High|Medium|Low|Critical)\)/.exec(lines[i])
      if (!sm) continue
      const cvss = parseFloat(sm[1]) || 0
      if (cvss <= 0) continue
      const name = lines[i - 1]?.trim() || 'Unbekannte Schwachstelle'
      // Hostname suche in nächsten 3 Zeilen davor
      const hostLine = lines.slice(Math.max(0, i - 5), i).find(l => /Hostname:/i.test(l))
      const host = hostLine ? hostLine.replace(/Hostname:\s*/i, '').trim() : ''

      findings.push({
        nvtOid: '', nvtName: name, severity: sm[2].toLowerCase(),
        cvssScore: cvss, cveIds: [], host, port: '', summary: '',
        solution: '', solutionType: '', insight: '', affected: '', detectionResult: ''
      })
    }
  }

  return findings
}

function extractField(text, label) {
  const m = new RegExp(label + ':\\s*([^\\n]+)', 'i').exec(text)
  return m ? m[1].trim() : null
}

function extractSection(text, heading) {
  const m = new RegExp(heading + '[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n[A-Z][^\\n]+\\n|$)', 'i').exec(text)
  return m ? m[1].trim() : ''
}

function extractCves(text) {
  const cves = []
  const re = /CVE-\d{4}-\d{4,}/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (!cves.includes(m[0])) cves.push(m[0])
  }
  return cves
}

// ── Ollama-Fallback ───────────────────────────────────────────────────────────

async function ollamaParseFindigs(text) {
  // Nur erste 8000 Zeichen des Texts senden (Kontext-Limit)
  const excerpt = text.slice(0, 8000)

  const prompt = `You are a security analyst. Extract all vulnerabilities from the following Greenbone Security Report text.
Return ONLY a valid JSON array. Each element must have these exact fields:
- nvtName: string (vulnerability name)
- severity: string (one of: critical, high, medium, low)
- cvssScore: number
- cveIds: array of strings (CVE-IDs like "CVE-2024-1234", can be empty)
- host: string (IP address or hostname)
- summary: string (brief description, max 200 chars)
- solution: string (fix/recommendation, max 200 chars)

Report text:
${excerpt}

JSON array:`

  try {
    const responseText = await ollamaGenerate(prompt)
    const jsonMatch = /\[[\s\S]*\]/.exec(responseText)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.map(f => ({
      nvtOid:       '',
      nvtName:      f.nvtName      || 'Unbekannte Schwachstelle',
      severity:     normalizeSeverity(f.severity),
      cvssScore:    parseFloat(f.cvssScore) || 0,
      cveIds:       Array.isArray(f.cveIds) ? f.cveIds : [],
      host:         f.host         || '',
      port:         '',
      summary:      f.summary      || '',
      solution:     f.solution     || '',
      solutionType: '',
      insight:      '',
      affected:     '',
      detectionResult: ''
    })).filter(f => f.cvssScore > 0)
  } catch {
    return []
  }
}

function normalizeSeverity(s) {
  const v = String(s || '').toLowerCase()
  if (v === 'critical') return 'critical'
  if (v === 'high')     return 'high'
  if (v === 'medium')   return 'medium'
  return 'low'
}

function ollamaGenerate(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false })
    const req  = http.request({
      hostname: OLLAMA_HOST, port: OLLAMA_PORT,
      path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data).response || '') }
        catch { resolve('') }
      })
    })
    req.on('error', reject)
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama timeout')) })
    req.write(body)
    req.end()
  })
}

module.exports = { parsePdf }
