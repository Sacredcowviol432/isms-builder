// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// Persistent store for editable dropdown lists used throughout the application.
// Data saved to data/custom-lists.json; falls back to defaults if file missing.

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DB_FILE = path.join(_BASE, 'custom-lists.json')

const DEFAULTS = {
  templateTypes: ['Policy', 'Procedure', 'Risk', 'SoA', 'Incident', 'Release'],
  riskCategories: [
    { id: 'technical',      label: 'Technisch',       icon: 'ph-cpu' },
    { id: 'organizational', label: 'Organisatorisch',  icon: 'ph-users' },
    { id: 'physical',       label: 'Physisch',         icon: 'ph-building' },
    { id: 'legal',          label: 'Rechtlich',        icon: 'ph-scales' },
  ],
  riskTreatments: [
    { id: 'reduce',   label: 'Reduzieren' },
    { id: 'accept',   label: 'Akzeptieren' },
    { id: 'avoid',    label: 'Vermeiden' },
    { id: 'transfer', label: 'Übertragen' },
  ],
  gdprDataCategories: ['name', 'email', 'phone', 'address', 'health', 'biometric', 'financial', 'location', 'other'],
  gdprSubjectTypes: [
    { id: 'customers',        label: 'Kunden' },
    { id: 'employees',        label: 'Mitarbeiter' },
    { id: 'contractors',      label: 'Auftragnehmer' },
    { id: 'website_visitors', label: 'Website-Besucher' },
    { id: 'minors',           label: 'Minderjährige' },
  ],
  incidentTypes: [
    { id: 'malware',              label: 'Malware / Schadsoftware' },
    { id: 'phishing',             label: 'Phishing / Scam' },
    { id: 'data_theft',           label: 'Datenklau / Datenleck' },
    { id: 'unauthorized_access',  label: 'Unberechtigter Zugriff' },
    { id: 'ransomware',           label: 'Ransomware' },
    { id: 'social_engineering',   label: 'Social Engineering' },
    { id: 'other',                label: 'Sonstiges' },
  ],
}

const ALLOWED_LIST_IDS = Object.keys(DEFAULTS)

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    }
  } catch (e) {
    console.error('[customListsStore] load error:', e.message)
  }
  return {}
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

function getAll() {
  const stored = load()
  const result = {}
  for (const key of ALLOWED_LIST_IDS) {
    result[key] = stored[key] !== undefined ? stored[key] : DEFAULTS[key]
  }
  return result
}

function getList(listId) {
  if (!ALLOWED_LIST_IDS.includes(listId)) return null
  const stored = load()
  return stored[listId] !== undefined ? stored[listId] : DEFAULTS[listId]
}

function setList(listId, items) {
  if (!ALLOWED_LIST_IDS.includes(listId)) return null
  const stored = load()
  stored[listId] = items
  save(stored)
  return items
}

function resetList(listId) {
  if (!ALLOWED_LIST_IDS.includes(listId)) return null
  const stored = load()
  delete stored[listId]
  save(stored)
  return DEFAULTS[listId]
}

module.exports = { getAll, getList, setList, resetList, ALLOWED_LIST_IDS, DEFAULTS }
