// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Persistent store for editable dropdown lists used throughout the application.
// Data saved to data/custom-lists.json; falls back to defaults if file missing.

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DB_FILE = path.join(_BASE, 'custom-lists.json')

const DEFAULTS = {
  templateTypes: ['Policy', 'Procedure', 'Risk Policy', 'SoA', 'Incident', 'Release'],
  riskCategories: [
    { id: 'technical',      label: 'Technical',      icon: 'ph-cpu' },
    { id: 'organizational', label: 'Organizational', icon: 'ph-users' },
    { id: 'physical',       label: 'Physical',       icon: 'ph-building' },
    { id: 'legal',          label: 'Legal',          icon: 'ph-scales' },
  ],
  riskTreatments: [
    { id: 'reduce',   label: 'Reduce' },
    { id: 'accept',   label: 'Accept' },
    { id: 'avoid',    label: 'Avoid' },
    { id: 'transfer', label: 'Transfer' },
  ],
  gdprDataCategories: ['name', 'email', 'phone', 'address', 'health', 'biometric', 'financial', 'location', 'other'],
  gdprSubjectTypes: [
    { id: 'customers',        label: 'Customers' },
    { id: 'employees',        label: 'Employees' },
    { id: 'contractors',      label: 'Contractors' },
    { id: 'website_visitors', label: 'Website Visitors' },
    { id: 'minors',           label: 'Minors' },
  ],
  incidentTypes: [
    { id: 'malware',              label: 'Malware / Malicious Software' },
    { id: 'phishing',             label: 'Phishing / Scam' },
    { id: 'data_theft',           label: 'Data Theft / Data Leak' },
    { id: 'unauthorized_access',  label: 'Unauthorized Access' },
    { id: 'ransomware',           label: 'Ransomware' },
    { id: 'social_engineering',   label: 'Social Engineering' },
    { id: 'other',                label: 'Other' },
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
