// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Scan-Importer: Clustering + Dedup + Risk-Draft-Erstellung
'use strict'

const riskStore = require('../db/riskStore')

// CVSS → ISMS probability/impact Mapping
// Wir setzen probability=3 (mittel) und variieren impact nach CVSS
const CVSS_TO_IMPACT = { critical: 5, high: 4, medium: 3, low: 2 }
const CVSS_TO_PROB   = { critical: 4, high: 3, medium: 2, low: 2 }

/**
 * Importiert ein Finding-Array (aus XML- oder PDF-Parser) ins Risk-Register.
 * @param {Array}  findings      - Ergebnis von greenboneXmlParser oder greenobonePdfParser
 * @param {object} options
 *   @param {string} options.scanRef          - z.B. "520-IFINA-PMSOLID-172.16.123.0"
 *   @param {string} options.scanDate         - ISO-Datum-String des Scans
 *   @param {string} options.importedBy       - Username des importierenden Users
 *   @param {string} options.entityId         - Gesellschaft (applicableEntities)
 *   @param {boolean} options.skipDuplicates  - Bereits vorhandene NVT-OIDs überspringen (default: true)
 * @returns {{ created: number, skipped: number, risks: Array }}
 */
function importFindings(findings, options = {}) {
  const {
    scanRef      = null,
    scanDate     = null,
    importedBy   = 'system',
    entityId     = null,
    skipDuplicates = true
  } = options

  // 1) Bestehende NVT-OIDs laden (Dedup)
  const existing = skipDuplicates ? riskStore.getAll() : []
  const existingOids = new Set(existing.map(r => r.scanRef).filter(Boolean))

  // 2) Findings clustern: gleiche NVT-OID → ein Risiko mit allen betroffenen Hosts
  const clusters = clusterByNvt(findings)

  let created = 0
  let skipped = 0
  const createdRisks = []

  for (const cluster of clusters) {
    // Dedup: Wenn bereits ein Risiko mit gleichem scanRef+nvtOid existiert, überspringen
    const dedupKey = `${scanRef}|${cluster.nvtOid}`
    if (skipDuplicates && cluster.nvtOid && existingOids.has(dedupKey)) {
      skipped++
      continue
    }

    const risk = buildRiskDraft(cluster, { scanRef, scanDate, importedBy, entityId, dedupKey })
    const created_risk = riskStore.create(risk, importedBy)
    createdRisks.push(created_risk)
    created++
  }

  return { created, skipped, total: findings.length, clusters: clusters.length, risks: createdRisks }
}

// ── Clustering ────────────────────────────────────────────────────────────────

function clusterByNvt(findings) {
  const map = new Map()

  for (const f of findings) {
    // Cluster-Key: NVT-OID wenn vorhanden, sonst normalisierter Name
    const key = f.nvtOid || normalizeTitle(f.nvtName)

    if (!map.has(key)) {
      map.set(key, {
        nvtOid:       f.nvtOid,
        nvtName:      f.nvtName,
        severity:     f.severity,
        cvssScore:    f.cvssScore,
        cveIds:       [...f.cveIds],
        hosts:        [],
        summary:      f.summary,
        solution:     f.solution,
        solutionType: f.solutionType,
        insight:      f.insight
      })
    }

    const cluster = map.get(key)

    // Schwersten Severity-Wert behalten
    if (severityRank(f.severity) > severityRank(cluster.severity)) {
      cluster.severity  = f.severity
      cluster.cvssScore = f.cvssScore
    }

    // Host hinzufügen (ohne Duplikate)
    if (f.host && !cluster.hosts.includes(f.host)) cluster.hosts.push(f.host)

    // CVEs mergen
    for (const cve of f.cveIds) {
      if (!cluster.cveIds.includes(cve)) cluster.cveIds.push(cve)
    }

    // Längere Summary bevorzugen
    if ((f.summary || '').length > (cluster.summary || '').length) cluster.summary = f.summary
    if ((f.solution || '').length > (cluster.solution || '').length) cluster.solution = f.solution
  }

  return Array.from(map.values())
}

function severityRank(s) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0
}

function normalizeTitle(title) {
  return String(title || '').toLowerCase().replace(/\s+/g, '_').slice(0, 80)
}

// ── Risk-Draft-Builder ────────────────────────────────────────────────────────

function buildRiskDraft(cluster, { scanRef, scanDate, importedBy, entityId, dedupKey }) {
  const hostList = cluster.hosts.length > 0
    ? cluster.hosts.join(', ')
    : 'Unbekannt'

  const hostCount = cluster.hosts.length
  const hostSuffix = hostCount > 1 ? ` (${hostCount} Hosts betroffen)` : ''

  // Beschreibung aus Scan-Daten zusammenbauen
  const lines = []
  if (cluster.summary) lines.push(cluster.summary)
  if (cluster.insight)  lines.push('\n**Vulnerability Insight:**\n' + cluster.insight)
  lines.push(`\n**Betroffene Hosts:** ${hostList}`)
  if (cluster.cveIds.length > 0) lines.push(`\n**CVEs:** ${cluster.cveIds.join(', ')}`)
  if (scanDate) lines.push(`\n**Scan-Datum:** ${scanDate}`)
  if (scanRef)  lines.push(`**Scan-Referenz:** ${scanRef}`)

  const description = lines.join('\n').slice(0, 2000)

  // Empfehlung/Lösung
  const mitigationNotes = cluster.solution
    ? `[${cluster.solutionType || 'VendorFix'}] ${cluster.solution}`.slice(0, 1000)
    : ''

  return {
    title:              `[SCAN] ${cluster.nvtName}${hostSuffix}`,
    description,
    category:           'technical',
    threat:             `Schwachstelle erkannt durch Greenbone-Scan: ${cluster.nvtName}`,
    vulnerability:      cluster.summary?.slice(0, 500) || cluster.nvtName,
    probability:        CVSS_TO_PROB[cluster.severity]   || 2,
    impact:             CVSS_TO_IMPACT[cluster.severity] || 3,
    treatmentOption:    'reduce',
    mitigationNotes,
    owner:              '',
    status:             'open',
    applicableEntities: entityId ? [entityId] : [],
    linkedControls:     [],
    linkedTemplates:    [],
    // Scanner-Felder
    needsReview:        true,
    source:             'greenbone-scan',
    scanRef:            dedupKey,   // NVT-OID für Dedup in künftigen Importen
    cvssScore:          cluster.cvssScore,
    cveIds:             cluster.cveIds
  }
}

module.exports = { importFindings }
