// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// crossmapStore.js – Cross-Framework Control Mapping
// Bildet thematische Gruppen zwischen Controls verschiedener Frameworks ab.
// Speicherung in data/crossmap.json (überschreibbar; Seeds dienen als Default)

const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(DATA_DIR, 'crossmap.json')

// ─────────────────────────────────────────────────────────────────
// Seed-Mapping-Gruppen (thematisch kuratiert)
// ─────────────────────────────────────────────────────────────────
const SEED_GROUPS = [
  {
    id: 'CG-GOV-POLICY',
    topic: 'IS-Richtlinien & Governance',
    description: 'Übergreifende Sicherheitsrichtlinien, Strategie und Governance-Strukturen',
    controls: ['ISO-5.1', 'ISO-5.4', 'BSI-ISMS.1', 'NIS2-a', 'EUCS-GOV.1', 'EUCS-GOV.2', 'EUAI-GOV.1', 'EUAI-GOV.3']
  },
  {
    id: 'CG-RISK',
    topic: 'Risikomanagement',
    description: 'Risikoanalyse, -bewertung und -behandlung',
    controls: ['ISO-5.1', 'BSI-ISMS.2', 'NIS2-a', 'EUCS-GOV.3', 'EUAI-ART9', 'EUAI-GOV.2']
  },
  {
    id: 'CG-ROLES',
    topic: 'Rollen & Verantwortlichkeiten',
    description: 'Zuweisung von IS-Rollen, Aufgabentrennung und Verantwortlichkeiten',
    controls: ['ISO-5.2', 'ISO-5.3', 'BSI-ORP.1', 'BSI-ORP.2', 'EUCS-GOV.2', 'EUAI-GOV.3']
  },
  {
    id: 'CG-ACCESS',
    topic: 'Zugriffskontrolle & Identity Management',
    description: 'Zugriffssteuerung, Identitätsverwaltung, Authentifizierung und Rechte',
    controls: ['ISO-5.15', 'ISO-5.16', 'ISO-5.17', 'ISO-5.18', 'BSI-ORP.4', 'NIS2-i', 'NIS2-j', 'EUCS-IAM.1', 'EUCS-IAM.2', 'EUCS-IAM.3']
  },
  {
    id: 'CG-INCIDENT',
    topic: 'Vorfallmanagement & Incident Response',
    description: 'Erkennung, Behandlung, Dokumentation und Lernen aus Sicherheitsvorfällen',
    controls: ['ISO-5.24', 'ISO-5.25', 'ISO-5.26', 'ISO-5.27', 'ISO-5.28', 'ISO-6.8', 'BSI-DER.2', 'NIS2-b', 'EUCS-INC.1', 'EUCS-INC.2']
  },
  {
    id: 'CG-BCM',
    topic: 'Business Continuity & Notfallvorsorge',
    description: 'Betriebskontinuität, Backup, Notfallwiederherstellung und Krisenmanagement',
    controls: ['ISO-5.29', 'ISO-5.30', 'BSI-DER.4', 'NIS2-c', 'EUCS-BCM.1', 'EUCS-BCM.2']
  },
  {
    id: 'CG-SUPPLY',
    topic: 'Lieferkettensicherheit & Drittparteien',
    description: 'Sicherheit in Lieferketten, Lieferantenverträgen und Cloud-Diensten',
    controls: ['ISO-5.19', 'ISO-5.20', 'ISO-5.21', 'ISO-5.22', 'ISO-5.23', 'BSI-OPS.2', 'NIS2-d', 'EUCS-SCM.1', 'EUCS-SCM.2']
  },
  {
    id: 'CG-VULN',
    topic: 'Schwachstellenmanagement & Patch',
    description: 'Erkennung, Bewertung und Behebung von Schwachstellen und Software-Patches',
    controls: ['ISO-8.8', 'BSI-DER.3', 'NIS2-e', 'EUCS-VUL.1', 'EUCS-VUL.2']
  },
  {
    id: 'CG-CRYPTO',
    topic: 'Kryptografie & Schlüsselmanagement',
    description: 'Einsatz von Kryptografie, Schlüsselmanagement und Verschlüsselung',
    controls: ['ISO-8.24', 'ISO-8.25', 'NIS2-h', 'EUCS-CRY.1']
  },
  {
    id: 'CG-LOG',
    topic: 'Logging & Monitoring',
    description: 'Protokollierung von Ereignissen, Überwachung und Audit-Trails',
    controls: ['ISO-8.15', 'ISO-8.16', 'ISO-8.17', 'BSI-DER.1', 'EUCS-LOG.1', 'EUAI-ART12']
  },
  {
    id: 'CG-PHYSICAL',
    topic: 'Physische Sicherheit',
    description: 'Perimeterschutz, Zutrittskontrolle und Schutz der physischen Infrastruktur',
    controls: ['ISO-7.1', 'ISO-7.2', 'ISO-7.3', 'ISO-7.4', 'BSI-INF.1', 'BSI-INF.2', 'EUCS-PHY.1']
  },
  {
    id: 'CG-TRAINING',
    topic: 'Schulung & Sensibilisierung',
    description: 'Sicherheitsbewusstsein, Schulungen und Cyber-Hygiene für Mitarbeiter',
    controls: ['ISO-6.3', 'BSI-ORP.3', 'NIS2-g', 'EUCS-PEN.1']
  },
  {
    id: 'CG-PRIVACY',
    topic: 'Datenschutz & personenbezogene Daten',
    description: 'Schutz personenbezogener Daten, Klassifizierung und Datenlöschung',
    controls: ['ISO-5.34', 'ISO-8.11', 'ISO-8.12', 'EUCS-DPR.1', 'EUCS-DPR.2']
  },
  {
    id: 'CG-CLASSIFY',
    topic: 'Informationsklassifizierung & Asset-Management',
    description: 'Inventarisierung, Klassifizierung und Kennzeichnung von Informationswerten',
    controls: ['ISO-5.9', 'ISO-5.10', 'ISO-5.12', 'ISO-5.13', 'BSI-ORP.2', 'NIS2-i']
  },
  {
    id: 'CG-CHANGE',
    topic: 'Änderungsmanagement & Konfigurationskontrolle',
    description: 'Change Management, Konfigurationsmanagement und sichere Entwicklung',
    controls: ['ISO-8.32', 'BSI-OPS.1', 'NIS2-e', 'EUCS-CHM.1', 'EUCS-CHM.2']
  },
  {
    id: 'CG-COMPLY',
    topic: 'Compliance & Auditvorbereitung',
    description: 'Einhaltung gesetzlicher Anforderungen, interne Audits und unabhängige Prüfungen',
    controls: ['ISO-5.31', 'ISO-5.35', 'ISO-5.36', 'BSI-ISMS.2', 'NIS2-f', 'EUAI-ART43']
  },
  {
    id: 'CG-HR',
    topic: 'Personalsicherheit',
    description: 'Hintergrundprüfungen, Einarbeitung, Vertragsbedingungen und Offboarding',
    controls: ['ISO-6.1', 'ISO-6.2', 'ISO-6.4', 'ISO-6.5', 'ISO-6.6', 'BSI-ORP.1', 'NIS2-i', 'EUCS-PEN.1']
  },
  {
    id: 'CG-AI-RISK',
    topic: 'KI-Risikoklassifizierung & Governance',
    description: 'Inventar, Risikoklassifizierung und Governance eingesetzter KI-Systeme',
    controls: ['EUAI-ART5', 'EUAI-ART9', 'EUAI-GOV.1', 'EUAI-GOV.2', 'EUAI-GOV.3']
  },
  {
    id: 'CG-AI-DOC',
    topic: 'KI-Dokumentation & Transparenz',
    description: 'Technische Dokumentation, Transparenzpflichten und Human Oversight für Hochrisiko-KI',
    controls: ['EUAI-ART11', 'EUAI-ART13', 'EUAI-ART14', 'EUAI-ART16', 'EUAI-ART17', 'EUAI-ART18', 'EUAI-ART43']
  },
  {
    id: 'CG-NETWORK',
    topic: 'Netzwerksicherheit & Segmentierung',
    description: 'Netzwerkschutz, Segmentierung, Firewalls und sichere Kommunikation',
    controls: ['ISO-8.20', 'ISO-8.21', 'ISO-8.22', 'BSI-NET.1', 'BSI-NET.2', 'EUCS-NET.1']
  },
]

// ─────────────────────────────────────────────────────────────────
// Datei-I/O
// ─────────────────────────────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(SEED_GROUPS, null, 2))
    return SEED_GROUPS
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return SEED_GROUPS
  }
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/** Alle Mapping-Gruppen */
function getAll() {
  return load()
}

/**
 * Alle Gruppen, die eine bestimmte Control-ID enthalten.
 * @param {string} controlId  z.B. 'ISO-5.1'
 * @returns {Array}  passende Gruppen
 */
function getForControl(controlId) {
  return load().filter(g => g.controls.includes(controlId))
}

/**
 * Für eine Control-ID: alle verwandten Control-IDs (ohne die eigene ID).
 * Gibt eine Map mit groupId → [ related controls ] zurück.
 * @param {string} controlId
 * @returns {Array<{groupId, topic, related: string[]}>}
 */
function getRelated(controlId) {
  const groups = getForControl(controlId)
  return groups.map(g => ({
    groupId: g.id,
    topic: g.topic,
    description: g.description,
    related: g.controls.filter(c => c !== controlId)
  }))
}

module.exports = { getAll, getForControl, getRelated }
