// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
/**
 * MariaDB/MySQL-backed template store.
 * Exposes the same async interface as sqliteStore.js so storage.js can swap it in.
 * All methods return Promises — routes already use `await storage.method()`.
 */

const { getPool, init: initDb } = require('./mariadbDatabase')

const VALID_STATUSES = ['draft', 'review', 'approved', 'archived']
const TRANSITIONS = {
  draft:    [{ to: 'review',    minRole: 'editor' }],
  review:   [{ to: 'approved',  minRole: 'contentowner' },
             { to: 'draft',     minRole: 'editor' }],
  approved: [{ to: 'review',    minRole: 'contentowner' },
             { to: 'archived',  minRole: 'contentowner' }],
  archived: [{ to: 'draft',     minRole: 'admin' }],
}
const ROLE_RANK = { reader: 1, editor: 2, dept_head: 2, contentowner: 3, admin: 4 }

function nowISO() { return new Date().toISOString() }
function generateId(type) { return `${type}_${Date.now()}` }

// ── Row ↔ object conversion ──────────────────────────────────────────────────

function rowToTemplate(row) {
  if (!row) return null
  return {
    id:                 row.id,
    type:               row.type,
    language:           row.language,
    title:              row.title,
    content:            row.content,
    version:            row.version,
    status:             row.status,
    owner:              row.owner || null,
    nextReviewDate:     row.next_review_date || null,
    parentId:           row.parent_id || null,
    sortOrder:          row.sort_order || 0,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
    deletedAt:          row.deleted_at || null,
    deletedBy:          row.deleted_by || null,
    linkedControls:     _parseJson(row.linked_controls,     []),
    applicableEntities: _parseJson(row.applicable_entities, []),
    attachments:        _parseJson(row.attachments,         []),
    history:            _parseJson(row.history,             []),
    statusHistory:      _parseJson(row.status_history,      []),
  }
}

function _parseJson(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function _getOne(sql, params) {
  const [rows] = await getPool().execute(sql, params)
  return rows[0] || null
}

async function _getAll(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

async function _run(sql, params = []) {
  const [result] = await getPool().execute(sql, params)
  return result
}

// ── Store methods ─────────────────────────────────────────────────────────────

module.exports = {
  init: async () => { await initDb() },

  // ── Query ──────────────────────────────────────────────────────────────────

  getTemplates: async ({ type, language, status } = {}) => {
    let sql = 'SELECT * FROM templates WHERE deleted_at IS NULL'
    const params = []
    if (type)     { sql += ' AND type = ?';     params.push(type) }
    if (language) { sql += ' AND language = ?'; params.push(language) }
    if (status)   { sql += ' AND status = ?';   params.push(status) }
    sql += ' ORDER BY sort_order ASC, title ASC'
    const rows = await _getAll(sql, params)
    return rows.map(rowToTemplate)
  },

  getTemplate: async (type, id) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type = ? AND id = ? AND deleted_at IS NULL',
      [type, id]
    )
    return rowToTemplate(row)
  },

  // ── Create ─────────────────────────────────────────────────────────────────

  createTemplate: async ({ type, language, title, content, owner, parentId }) => {
    const id  = generateId(type)
    const now = nowISO()
    const history       = JSON.stringify([{ version: 1, content: content || '', updatedAt: now }])
    const statusHistory = JSON.stringify([{ status: 'draft', changedBy: owner || 'system', changedAt: now }])
    await _run(
      `INSERT INTO templates
         (id, type, language, title, content, version, status, owner,
          next_review_date, parent_id, sort_order, created_at, updated_at,
          linked_controls, applicable_entities, attachments, history, status_history)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, type, language || 'de', title || '', content || '',
        1, 'draft', owner || null,
        null, parentId || null, 0, now, now,
        '[]', '[]', '[]', history, statusHistory,
      ]
    )
    return module.exports.getTemplate(type, id)
  },

  // ── Update ─────────────────────────────────────────────────────────────────

  updateTemplate: async (type, id, { title, content, owner, applicableEntities, linkedControls, parentId, nextReviewDate }) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type = ? AND id = ? AND deleted_at IS NULL',
      [type, id]
    )
    if (!row) return null
    const t = rowToTemplate(row)

    if (title     !== undefined) t.title     = title
    if (typeof content === 'string') t.content = content
    if (owner     !== undefined) t.owner     = owner
    if (Array.isArray(applicableEntities)) t.applicableEntities = applicableEntities
    if (Array.isArray(linkedControls))     t.linkedControls     = linkedControls
    if (parentId  !== undefined) t.parentId  = parentId || null
    if (nextReviewDate !== undefined) t.nextReviewDate = nextReviewDate || null

    t.version  += 1
    t.updatedAt = nowISO()
    t.history.push({ version: t.version, content: t.content, updatedAt: t.updatedAt })

    await _run(
      `UPDATE templates SET
         title=?, content=?, version=?, owner=?, next_review_date=?,
         parent_id=?, updated_at=?, linked_controls=?, applicable_entities=?,
         history=?, status_history=?
       WHERE type=? AND id=?`,
      [
        t.title, t.content, t.version, t.owner, t.nextReviewDate,
        t.parentId, t.updatedAt,
        JSON.stringify(t.linkedControls),
        JSON.stringify(t.applicableEntities),
        JSON.stringify(t.history),
        JSON.stringify(t.statusHistory),
        type, id,
      ]
    )
    return t
  },

  // ── Move & Reorder ─────────────────────────────────────────────────────────

  moveTemplate: async (type, id, { parentId, sortOrder }) => {
    const row = await _getOne('SELECT * FROM templates WHERE type=? AND id=?', [type, id])
    if (!row) return { ok: false, error: 'Not found' }

    // Cycle check
    if (parentId) {
      let cursor = parentId
      const visited = new Set()
      while (cursor) {
        if (cursor === id) return { ok: false, error: 'Circular reference' }
        if (visited.has(cursor)) break
        visited.add(cursor)
        const p = await _getOne('SELECT parent_id FROM templates WHERE id=?', [cursor])
        cursor = p?.parent_id || null
      }
    }
    await _run(
      'UPDATE templates SET parent_id=?, sort_order=?, updated_at=? WHERE type=? AND id=?',
      [parentId || null, sortOrder ?? row.sort_order, nowISO(), type, id]
    )
    return { ok: true }
  },

  reorderTemplates: async (updates) => {
    // updates: [{ id, sortOrder }]
    for (const { id, sortOrder } of updates) {
      await _run(
        'UPDATE templates SET sort_order=?, updated_at=? WHERE id=?',
        [sortOrder, nowISO(), id]
      )
    }
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  setStatus: async (type, id, { status: newStatus, changedBy, role }) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type=? AND id=? AND deleted_at IS NULL',
      [type, id]
    )
    if (!row) return { ok: false, error: 'Not found' }
    if (!VALID_STATUSES.includes(newStatus)) return { ok: false, error: 'Invalid status' }

    const t = rowToTemplate(row)
    const currentStatus = t.status || 'draft'
    if (currentStatus === newStatus) return { ok: false, error: 'Already in this status' }

    const allowed = (TRANSITIONS[currentStatus] || []).find(tr => tr.to === newStatus)
    if (!allowed) return { ok: false, error: `Transition ${currentStatus} → ${newStatus} not allowed` }

    const userRank     = ROLE_RANK[role?.toLowerCase()] || 0
    const requiredRank = ROLE_RANK[allowed.minRole]     || 0
    if (userRank < requiredRank) {
      return { ok: false, error: `Role '${role}' insufficient. Requires '${allowed.minRole}'` }
    }

    const now = nowISO()
    t.status = newStatus
    t.updatedAt = now
    if (!Array.isArray(t.statusHistory)) t.statusHistory = []
    t.statusHistory.push({ status: newStatus, changedBy: changedBy || 'unknown', changedAt: now })

    await _run(
      'UPDATE templates SET status=?, updated_at=?, status_history=? WHERE type=? AND id=?',
      [newStatus, now, JSON.stringify(t.statusHistory), type, id]
    )
    return { ok: true, template: t }
  },

  // ── Soft-delete / Restore / Permanent ─────────────────────────────────────

  deleteTemplate: async (type, id, deletedBy) => {
    const result = await _run(
      'UPDATE templates SET deleted_at=?, deleted_by=? WHERE type=? AND id=? AND deleted_at IS NULL',
      [nowISO(), deletedBy || null, type, id]
    )
    return result.affectedRows > 0
  },

  permanentDeleteTemplate: async (type, id) => {
    const result = await _run('DELETE FROM templates WHERE type=? AND id=?', [type, id])
    return result.affectedRows > 0
  },

  restoreTemplate: async (type, id) => {
    const row = await _getOne('SELECT * FROM templates WHERE type=? AND id=?', [type, id])
    if (!row) return null
    await _run(
      'UPDATE templates SET deleted_at=NULL, deleted_by=NULL, updated_at=? WHERE type=? AND id=?',
      [nowISO(), type, id]
    )
    return rowToTemplate({ ...row, deleted_at: null, deleted_by: null })
  },

  getDeletedTemplates: async () => {
    const rows = await _getAll(
      'SELECT * FROM templates WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    )
    return rows.map(rowToTemplate)
  },

  // ── History ────────────────────────────────────────────────────────────────

  getHistory: async (type, id) => {
    const row = await _getOne('SELECT history FROM templates WHERE type=? AND id=?', [type, id])
    return row ? _parseJson(row.history, []) : null
  },

  getStatusHistory: async (type, id) => {
    const row = await _getOne('SELECT status_history FROM templates WHERE type=? AND id=?', [type, id])
    return row ? _parseJson(row.status_history, []) : null
  },

  // ── Tree & Breadcrumb ──────────────────────────────────────────────────────

  getTemplateTree: async (type, language) => {
    let sql = 'SELECT * FROM templates WHERE deleted_at IS NULL'
    const params = []
    if (type)     { sql += ' AND type=?';     params.push(type) }
    if (language) { sql += ' AND language=?'; params.push(language) }
    const list = (await _getAll(sql, params)).map(rowToTemplate)

    const byId = {}
    list.forEach(t => { byId[t.id] = { ...t, children: [] } })
    const roots = []
    list.forEach(t => {
      const pid = t.parentId || null
      if (pid && byId[pid]) byId[pid].children.push(byId[t.id])
      else roots.push(byId[t.id])
    })
    function sortLevel(nodes) {
      nodes.sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title, 'de'))
      nodes.forEach(n => sortLevel(n.children))
    }
    sortLevel(roots)
    return roots
  },

  getTemplateBreadcrumb: async (type, id) => {
    const crumbs = []
    let currentId = id
    const visited = new Set()
    while (currentId) {
      if (visited.has(currentId)) break
      visited.add(currentId)
      const row = await _getOne(
        'SELECT id, title, type, parent_id FROM templates WHERE id=?',
        [currentId]
      )
      if (!row) break
      crumbs.unshift({ id: row.id, title: row.title, type: row.type })
      currentId = row.parent_id || null
    }
    return crumbs
  },

  // ── Controls ───────────────────────────────────────────────────────────────

  addLinkedControl: async (templateType, templateId, controlId) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type=? AND id=? AND deleted_at IS NULL',
      [templateType, templateId]
    )
    if (!row) return null
    const t = rowToTemplate(row)
    if (!t.linkedControls.includes(controlId)) {
      t.linkedControls.push(controlId)
      t.updatedAt = nowISO()
      await _run(
        'UPDATE templates SET linked_controls=?, updated_at=? WHERE type=? AND id=?',
        [JSON.stringify(t.linkedControls), t.updatedAt, templateType, templateId]
      )
    }
    return t
  },

  removeLinkedControl: async (templateType, templateId, controlId) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type=? AND id=? AND deleted_at IS NULL',
      [templateType, templateId]
    )
    if (!row) return null
    const t = rowToTemplate(row)
    t.linkedControls = t.linkedControls.filter(c => c !== controlId)
    t.updatedAt = nowISO()
    await _run(
      'UPDATE templates SET linked_controls=?, updated_at=? WHERE type=? AND id=?',
      [JSON.stringify(t.linkedControls), t.updatedAt, templateType, templateId]
    )
    return t
  },

  // ── Attachments ────────────────────────────────────────────────────────────

  addAttachment: async (type, id, attachmentMeta) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type=? AND id=? AND deleted_at IS NULL',
      [type, id]
    )
    if (!row) return null
    const t = rowToTemplate(row)
    t.attachments.push(attachmentMeta)
    t.updatedAt = nowISO()
    await _run(
      'UPDATE templates SET attachments=?, updated_at=? WHERE type=? AND id=?',
      [JSON.stringify(t.attachments), t.updatedAt, type, id]
    )
    return t
  },

  removeAttachment: async (type, id, attId) => {
    const row = await _getOne(
      'SELECT * FROM templates WHERE type=? AND id=? AND deleted_at IS NULL',
      [type, id]
    )
    if (!row) return null
    const t = rowToTemplate(row)
    const att = t.attachments.find(a => a.id === attId) || null
    t.attachments = t.attachments.filter(a => a.id !== attId)
    t.updatedAt = nowISO()
    await _run(
      'UPDATE templates SET attachments=?, updated_at=? WHERE type=? AND id=?',
      [JSON.stringify(t.attachments), t.updatedAt, type, id]
    )
    return { template: t, attachment: att }
  },

  TRANSITIONS,
  VALID_STATUSES,
}
