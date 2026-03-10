// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// Entity Store – Konzernstruktur (Holding + Gesellschaften)
// Persistenz: data/entities.json
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(DATA_DIR, 'entities.json')

const SEED = [
  { id: 'entity_holding', name: 'Holding GmbH', type: 'holding', parent: null, shortCode: 'HLD', active: true },
  { id: 'entity_sub1',    name: 'Gesellschaft Alpha GmbH', type: 'subsidiary', parent: 'entity_holding', shortCode: 'ALP', active: true },
  { id: 'entity_sub2',    name: 'Gesellschaft Beta GmbH',  type: 'subsidiary', parent: 'entity_holding', shortCode: 'BET', active: true },
  { id: 'entity_sub3',    name: 'Gesellschaft Gamma GmbH', type: 'subsidiary', parent: 'entity_holding', shortCode: 'GAM', active: true },
]

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(SEED, null, 2))
    return [...SEED]
  }
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [...SEED] }
}

function save(data) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function nowISO() { return new Date().toISOString() }
function genId() { return `entity_${Date.now()}` }

let store = load()

module.exports = {
  init: () => { store = load() },

  getAll: () => store.filter(e => e.active !== false),

  getById: (id) => store.find(e => e.id === id) || null,

  // Hierarchische Baumstruktur
  getTree: () => {
    const all = store.filter(e => e.active !== false)
    const map = {}
    for (const e of all) map[e.id] = { ...e, children: [] }
    const roots = []
    for (const e of all) {
      if (e.parent && map[e.parent]) {
        map[e.parent].children.push(map[e.id])
      } else {
        roots.push(map[e.id])
      }
    }
    return roots
  },

  create: ({ name, type = 'subsidiary', parent = 'entity_holding', shortCode = '', active = true }) => {
    const id = genId()
    const now = nowISO()
    const entity = { id, name, type, parent: parent || null, shortCode, active, createdAt: now, updatedAt: now }
    store.push(entity)
    save(store)
    return entity
  },

  update: (id, fields) => {
    const idx = store.findIndex(e => e.id === id)
    if (idx < 0) return null
    const allowed = ['name', 'type', 'parent', 'shortCode', 'active']
    for (const key of allowed) {
      if (fields[key] !== undefined) store[idx][key] = fields[key]
    }
    store[idx].updatedAt = nowISO()
    save(store)
    return store[idx]
  },

  delete: (id) => {
    const idx = store.findIndex(e => e.id === id)
    if (idx < 0) return false
    // Soft-delete: deaktivieren statt löschen (Referenzintegrität)
    store[idx].active = false
    store[idx].updatedAt = nowISO()
    save(store)
    return true
  }
}
