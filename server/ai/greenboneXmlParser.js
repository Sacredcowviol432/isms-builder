// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Greenbone XML-Parser: GMP-Export → strukturiertes Finding-Array
'use strict'

const xml2js = require('xml2js')

/**
 * Parst einen Greenbone GMP XML-Report-String.
 * Gibt ein Array von Finding-Objekten zurück:
 * {
 *   nvtOid, nvtName, severity (high|medium|low|critical),
 *   cvssScore, cveIds[], host, port, summary,
 *   solution, solutionType, insight, affected
 * }
 */
async function parseXml(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true })
  const root   = await parser.parseStringPromise(xmlString)

  // Greenbone XML kann als <report> oder als <get_reports_response> vorliegen
  const report = root?.get_reports_response?.report?.report
             || root?.get_reports_response?.report
             || root?.report?.report
             || root?.report
  if (!report) throw new Error('Kein <report>-Element gefunden')

  const results = normalizeArray(report?.results?.result)
  const findings = []

  for (const r of results) {
    const nvt      = r.nvt || {}
    const cvssStr  = r.severity ?? nvt.cvss_base ?? '0'
    const cvss     = parseFloat(cvssStr) || 0

    // Nur Findings mit CVSS > 0 (keine Log-Einträge)
    if (cvss <= 0) continue

    const cveIds = extractCveIds(nvt)
    const host   = typeof r.host === 'object' ? (r.host._ || r.host.hostname || '') : (r.host || '')

    findings.push({
      nvtOid:       nvt.oid         || '',
      nvtName:      nvt.name        || r.name || 'Unbekannte Schwachstelle',
      severity:     cvssToSeverity(cvss),
      cvssScore:    cvss,
      cveIds,
      host:         String(host).trim(),
      port:         r.port          || '',
      summary:      nvt.summary     || r.description || '',
      solution:     nvt.solution?._  || nvt.solution || '',
      solutionType: nvt.solution?.type || '',
      insight:      nvt.insight     || '',
      affected:     nvt.affected    || '',
      detectionResult: r.description || ''
    })
  }

  return findings
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function normalizeArray(v) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function cvssToSeverity(cvss) {
  if (cvss >= 9.0) return 'critical'
  if (cvss >= 7.0) return 'high'
  if (cvss >= 4.0) return 'medium'
  return 'low'
}

function extractCveIds(nvt) {
  const refs = normalizeArray(nvt?.refs?.ref)
  return refs
    .filter(r => (r.type || '').toUpperCase() === 'CVE')
    .map(r => r.id || '')
    .filter(Boolean)
}

module.exports = { parseXml }
