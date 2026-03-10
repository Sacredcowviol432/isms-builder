// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// Append-only audit log store.
// Entries are stored in data/audit-log.json, capped at MAX_ENTRIES (rolling).

const fs   = require('fs')
const path = require('path')
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE       = path.join(_BASE, 'audit-log.json')
const MAX_ENTRIES = 2000

function load() {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {}
  return []
}

function save(entries) {
  fs.writeFileSync(FILE, JSON.stringify(entries, null, 2))
}

/**
 * Append one audit entry.
 * @param {object} opts
 * @param {string} opts.user      - e-mail / username of the actor
 * @param {string} opts.action    - create | update | delete | login | logout | export | settings
 * @param {string} opts.resource  - template | risk | user | incident | org | gdpr | soa | list | entity
 * @param {string} [opts.resourceId]
 * @param {string} [opts.detail]  - human-readable description
 */
function append({ user, action, resource, resourceId = '', detail = '' }) {
  const entries = load()
  entries.unshift({
    id:         uuidv4(),
    ts:         new Date().toISOString(),
    user:       user || 'system',
    action,
    resource,
    resourceId: String(resourceId),
    detail,
  })
  // Rolling cap
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
  save(entries)
}

/**
 * Query audit log with optional filters.
 * @param {object} opts
 * @param {string} [opts.user]
 * @param {string} [opts.action]
 * @param {string} [opts.resource]
 * @param {string} [opts.from]   - ISO date string
 * @param {string} [opts.to]     - ISO date string
 * @param {number} [opts.limit]  - default 200
 * @param {number} [opts.offset] - default 0
 */
function query({ user, action, resource, from, to, limit = 200, offset = 0 } = {}) {
  let entries = load()

  if (user)     entries = entries.filter(e => e.user?.includes(user))
  if (action)   entries = entries.filter(e => e.action === action)
  if (resource) entries = entries.filter(e => e.resource === resource)
  if (from)     entries = entries.filter(e => e.ts >= from)
  if (to)       entries = entries.filter(e => e.ts <= to)

  const total = entries.length
  return { total, entries: entries.slice(offset, offset + limit) }
}

function clear() {
  save([])
}

module.exports = { append, query, clear }
