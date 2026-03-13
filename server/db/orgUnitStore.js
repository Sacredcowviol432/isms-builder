// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// IT Organisational Units — cross-module ownership/responsibility table.
// Data saved to data/org-units.json

'use strict'
const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'org-units.json')

const SEED = [
  {
    id:          'ou-cio',
    name:        'CIO',
    type:        'cio',
    parentId:    null,
    head:        '',
    email:       '',
    description: 'Chief Information Officer — strategic IT governance and oversight',
    createdAt:   '2026-03-12T00:00:00.000Z',
    updatedAt:   '2026-03-12T00:00:00.000Z',
  },
  {
    id:          'ou-groupit',
    name:        'GroupIT',
    type:        'group',
    parentId:    'ou-cio',
    head:        '',
    email:       '',
    description: 'IT Stabsstelle — central infrastructure operations. Provides service to subsidiaries without local IT.',
    createdAt:   '2026-03-12T00:00:00.000Z',
    updatedAt:   '2026-03-12T00:00:00.000Z',
  },
  {
    id:          'ou-groupapp',
    name:        'GroupApp',
    type:        'group',
    parentId:    'ou-cio',
    head:        '',
    email:       '',
    description: 'Applications Programming & Deployment — SAP, Navision, ERP systems and custom applications',
    createdAt:   '2026-03-12T00:00:00.000Z',
    updatedAt:   '2026-03-12T00:00:00.000Z',
  },
  {
    id:          'ou-localit',
    name:        'Local IT',
    type:        'local',
    parentId:    'ou-groupit',
    head:        '',
    email:       '',
    description: 'Local IT teams at subsidiary level. If no local IT exists, service is provided by GroupIT.',
    createdAt:   '2026-03-12T00:00:00.000Z',
    updatedAt:   '2026-03-12T00:00:00.000Z',
  },
]

function _load() {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch (e) {
    console.error('[orgUnitStore] load error:', e.message)
  }
  return []
}

function _save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function _seed() {
  const existing = _load()
  if (existing.length === 0) {
    _save(SEED)
    return SEED
  }
  return existing
}

function getAll() {
  return _seed()
}

function getById(id) {
  return _seed().find(u => u.id === id) || null
}

function create(body) {
  const units = _seed()
  const now = new Date().toISOString()
  const unit = {
    id:          'ou-' + Date.now(),
    name:        (body.name || '').trim(),
    type:        body.type || 'group',
    parentId:    body.parentId || null,
    head:        (body.head || '').trim(),
    email:       (body.email || '').trim(),
    description: (body.description || '').trim(),
    createdAt:   now,
    updatedAt:   now,
  }
  if (!unit.name) throw new Error('name required')
  units.push(unit)
  _save(units)
  return unit
}

function update(id, body) {
  const units = _seed()
  const idx = units.findIndex(u => u.id === id)
  if (idx < 0) return null
  const now = new Date().toISOString()
  const updated = {
    ...units[idx],
    name:        body.name        !== undefined ? (body.name || '').trim()        : units[idx].name,
    type:        body.type        !== undefined ? body.type                        : units[idx].type,
    parentId:    body.parentId    !== undefined ? (body.parentId || null)          : units[idx].parentId,
    head:        body.head        !== undefined ? (body.head || '').trim()         : units[idx].head,
    email:       body.email       !== undefined ? (body.email || '').trim()        : units[idx].email,
    description: body.description !== undefined ? (body.description || '').trim() : units[idx].description,
    updatedAt:   now,
  }
  if (!updated.name) throw new Error('name required')
  units[idx] = updated
  _save(units)
  return updated
}

function remove(id) {
  const units = _seed()
  const idx = units.findIndex(u => u.id === id)
  if (idx < 0) return false
  units.splice(idx, 1)
  _save(units)
  return true
}

module.exports = { getAll, getById, create, update, remove }
