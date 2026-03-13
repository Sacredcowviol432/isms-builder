// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const storage = require('../storage')
const entityStore = require('../db/entityStore')

// ── Templates ──

router.get('/templates', requireAuth, authorize('reader'), async (req, res) => {
  const { type, language } = req.query
  const list = await storage.getTemplates?.({ type, language })
  res.json(list)
})

router.get('/templates/tree', requireAuth, authorize('reader'), (req, res) => {
  const { type, language } = req.query
  res.json(storage.getTemplateTree?.(type, language) || [])
})

router.post('/templates/reorder', requireAuth, authorize('contentowner'), async (req, res) => {
  const { updates } = req.body
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be array' })
  storage.reorderTemplates?.(updates)
  res.json({ ok: true })
})

router.get('/template/:type/:id', requireAuth, authorize('reader'), async (req, res) => {
  const { type, id } = req.params
  const t = await storage.getTemplate?.(type, id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json(t)
})

router.post('/template', requireAuth, authorize('contentowner'), async (req, res) => {
  const { type, language, title, content, parentId } = req.body
  if (!type || !language || !title) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  const t = await storage.createTemplate?.({ type, language, title, content, parentId: parentId || null, owner: req.user })
  require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'template', resourceId: t?.id, detail: `${type}: ${title}` })
  res.status(201).json(t)
})

router.put('/template/:type/:id', requireAuth, authorize('editor'), async (req, res) => {
  const { type, id } = req.params
  const { title, content, applicableEntities, linkedControls, parentId, nextReviewDate } = req.body
  const existing = await storage.getTemplate?.(type, id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  if (Array.isArray(linkedControls)) {
    const soaStore = require('../db/soaStore')
    const prevControls = existing.linkedControls || []
    const added   = linkedControls.filter(c => !prevControls.includes(c))
    const removed = prevControls.filter(c => !linkedControls.includes(c))
    for (const cid of added)   soaStore.addLinkedTemplate(cid, id)
    for (const cid of removed) soaStore.removeLinkedTemplate(cid, id)
  }

  const t = await storage.updateTemplate?.(type, id, { title, content, applicableEntities, linkedControls, parentId, nextReviewDate })
  require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'template', resourceId: id, detail: `${type}: ${title || existing.title}` })
  res.json(t)
})

router.put('/template/:type/:id/move', requireAuth, authorize('contentowner'), async (req, res) => {
  const { type, id } = req.params
  const { parentId, sortOrder } = req.body
  const result = storage.moveTemplate?.(type, id, { parentId: parentId || null, sortOrder })
  if (!result) return res.status(404).json({ error: 'Not found' })
  if (result.error === 'circular') return res.status(400).json({ error: 'Zirkuläre Verknüpfung nicht erlaubt' })
  require('../db/auditStore').append({ user: req.user, action: 'move', resource: 'template', resourceId: id, detail: `parentId: ${parentId || 'root'}` })
  res.json(result)
})

router.delete('/template/:type/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const { type, id } = req.params
  const ok = await storage.deleteTemplate?.(type, id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'template', resourceId: id, detail: type })
  res.json({ deleted: true })
})

router.delete('/template/:type/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  const { type, id } = req.params
  const ok = storage.permanentDeleteTemplate?.(type, id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'template', resourceId: id, detail: type })
  res.json({ deleted: true, permanent: true })
})

router.post('/template/:type/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const { type, id } = req.params
  const item = storage.restoreTemplate?.(type, id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'template', resourceId: id, detail: type })
  res.json(item)
})

router.get('/template/:type/:id/history', requireAuth, authorize('reader'), async (req, res) => {
  const { type, id } = req.params
  const hist = await storage.getHistory?.(type, id)
  res.json(hist || [])
})

router.get('/template/:type/:id/status-history', requireAuth, authorize('reader'), async (req, res) => {
  const { type, id } = req.params
  const hist = await storage.getStatusHistory?.(type, id)
  if (hist === null) return res.status(404).json({ error: 'Not found' })
  res.json(hist)
})

router.patch('/template/:type/:id/status', requireAuth, authorize('editor'), async (req, res) => {
  const { type, id } = req.params
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })
  const result = await storage.setStatus?.(type, id, { status, changedBy: req.user, role: req.role })
  if (!result) return res.status(500).json({ error: 'Storage error' })
  if (!result.ok) return res.status(400).json({ error: result.error })
  res.json(result.template)
})

// ── Template-Anhänge ──
const TMPL_FILES_DIR = path.join(__dirname, '../../data/template-files')
if (!fs.existsSync(TMPL_FILES_DIR)) fs.mkdirSync(TMPL_FILES_DIR, { recursive: true })

const tmplAttachUpload = multer({
  dest: TMPL_FILES_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Dateityp nicht erlaubt'))
  }
})

router.post('/template/:type/:id/attachments', requireAuth, authorize('editor'), (req, res) => {
  const { type, id } = req.params
  tmplAttachUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' })
    const t = await storage.getTemplate?.(type, id)
    if (!t) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'Template nicht gefunden' }) }
    const attId = `att_${Date.now()}`
    const meta = {
      id: attId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user,
      uploadedAt: new Date().toISOString(),
      filePath: req.file.path
    }
    const updated = storage.addAttachment?.(type, id, meta)
    if (!updated) { fs.unlink(req.file.path, () => {}); return res.status(500).json({ error: 'Speicherfehler' }) }
    res.status(201).json(meta)
  })
})

router.get('/template/:type/:id/attachments/:attId/file', requireAuth, authorize('reader'), async (req, res) => {
  const { type, id, attId } = req.params
  const t = await storage.getTemplate?.(type, id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  const att = (t.attachments || []).find(a => a.id === attId)
  if (!att || !att.filePath || !fs.existsSync(att.filePath)) return res.status(404).json({ error: 'File not found' })
  const ext = path.extname(att.originalName || '').toLowerCase()
  const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
  const mime = mimeMap[ext] || 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  res.setHeader('Content-Disposition', `attachment; filename="${att.originalName}"`)
  res.sendFile(path.resolve(att.filePath))
})

router.delete('/template/:type/:id/attachments/:attId', requireAuth, authorize('editor'), async (req, res) => {
  const { type, id, attId } = req.params
  const result = storage.removeAttachment?.(type, id, attId)
  if (!result) return res.status(404).json({ error: 'Not found' })
  if (result.attachment?.filePath) fs.unlink(result.attachment.filePath, () => {})
  res.json({ deleted: true })
})

// ── Konzernstruktur: Entities ──

router.get('/entities/tree', requireAuth, authorize('reader'), (req, res) => {
  res.json(entityStore.getTree())
})
router.get('/entities', requireAuth, authorize('reader'), (req, res) => {
  res.json(entityStore.getAll())
})
router.get('/entities/:id', requireAuth, authorize('reader'), (req, res) => {
  const e = entityStore.getById(req.params.id)
  if (!e) return res.status(404).json({ error: 'Not found' })
  res.json(e)
})
router.post('/entities', requireAuth, authorize('admin'), (req, res) => {
  const { name, type, parent, shortCode } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  res.status(201).json(entityStore.create({ name, type, parent, shortCode }))
})
router.put('/entities/:id', requireAuth, authorize('admin'), (req, res) => {
  const updated = entityStore.update(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})
router.delete('/entities/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = entityStore.delete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'entity', resourceId: req.params.id })
  res.json({ deleted: true })
})

module.exports = router
