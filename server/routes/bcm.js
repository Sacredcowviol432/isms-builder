// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const bcmStore = require('../db/bcmStore')

router.get('/bcm/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(bcmStore.getSummary())
})

// BIA
router.get('/bcm/bia', requireAuth, authorize('reader'), (req, res) => {
  res.json(bcmStore.getBia())
})
router.get('/bcm/bia/:id', requireAuth, authorize('reader'), (req, res) => {
  const b = bcmStore.getBiaById(req.params.id)
  if (!b) return res.status(404).json({ error: 'Not found' })
  res.json(b)
})
router.post('/bcm/bia', requireAuth, authorize('editor'), (req, res) => {
  const b = bcmStore.createBia(req.body, { createdBy: req.user })
  require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_bia', detail: b.title })
  res.status(201).json(b)
})
router.put('/bcm/bia/:id', requireAuth, authorize('editor'), (req, res) => {
  const b = bcmStore.updateBia(req.params.id, req.body, { changedBy: req.user })
  if (!b) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_bia', detail: b.title })
  res.json(b)
})
router.delete('/bcm/bia/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!bcmStore.deleteBia(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_bia', detail: req.params.id })
  res.json({ ok: true })
})

// Plans
router.get('/bcm/plans', requireAuth, authorize('reader'), (req, res) => {
  res.json(bcmStore.getPlans())
})
router.get('/bcm/plans/:id', requireAuth, authorize('reader'), (req, res) => {
  const p = bcmStore.getPlanById(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})
router.post('/bcm/plans', requireAuth, authorize('editor'), (req, res) => {
  const p = bcmStore.createPlan(req.body, { createdBy: req.user })
  require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_plan', detail: p.title })
  res.status(201).json(p)
})
router.put('/bcm/plans/:id', requireAuth, authorize('editor'), (req, res) => {
  const p = bcmStore.updatePlan(req.params.id, req.body, { changedBy: req.user })
  if (!p) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_plan', detail: p.title })
  res.json(p)
})
router.delete('/bcm/plans/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!bcmStore.deletePlan(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_plan', detail: req.params.id })
  res.json({ ok: true })
})

// Exercises
router.get('/bcm/exercises', requireAuth, authorize('reader'), (req, res) => {
  res.json(bcmStore.getExercises())
})
router.get('/bcm/exercises/:id', requireAuth, authorize('reader'), (req, res) => {
  const e = bcmStore.getExerciseById(req.params.id)
  if (!e) return res.status(404).json({ error: 'Not found' })
  res.json(e)
})
router.post('/bcm/exercises', requireAuth, authorize('editor'), (req, res) => {
  const e = bcmStore.createExercise(req.body, { createdBy: req.user })
  require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_exercise', detail: e.title })
  res.status(201).json(e)
})
router.put('/bcm/exercises/:id', requireAuth, authorize('editor'), (req, res) => {
  const e = bcmStore.updateExercise(req.params.id, req.body, { changedBy: req.user })
  if (!e) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_exercise', detail: e.title })
  res.json(e)
})
router.delete('/bcm/exercises/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!bcmStore.deleteExercise(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_exercise', detail: req.params.id })
  res.json({ ok: true })
})

// ── BCM – Dokumenten-Upload ──
const BCM_FILES_DIR = path.join(__dirname, '../../data/bcm-files')
if (!fs.existsSync(BCM_FILES_DIR)) fs.mkdirSync(BCM_FILES_DIR, { recursive: true })

const bcmUpload = multer({
  dest: BCM_FILES_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.pptx']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

router.post('/bcm/:collection/:id/upload', requireAuth, authorize('editor'), (req, res) => {
  const GETTERS = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const UPDATERS = { bia: 'updateBia', plans: 'updatePlan', exercises: 'updateExercise' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  bcmUpload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const item = bcmStore[GETTERS[col]](req.params.id)
    if (!item) { fs.unlinkSync(req.file.path); return res.status(404).json({ error: 'Not found' }) }
    const attachment = {
      id:           Date.now().toString(36),
      filename:     req.file.originalname,
      storedName:   req.file.filename,
      size:         req.file.size,
      uploadedBy:   req.user,
      uploadedAt:   new Date().toISOString(),
    }
    const attachments = [...(item.attachments || []), attachment]
    bcmStore[UPDATERS[col]](req.params.id, { attachments })
    res.json({ ok: true, attachment })
  })
})

router.get('/bcm/:collection/:id/files/:fileId', requireAuth, authorize('reader'), (req, res) => {
  const GETTERS = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = bcmStore[GETTERS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(BCM_FILES_DIR, att.storedName)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' })
  res.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`)
  res.sendFile(path.resolve(filePath))
})

router.delete('/bcm/:collection/:id/files/:fileId', requireAuth, authorize('editor'), (req, res) => {
  const GETTERS  = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const UPDATERS = { bia: 'updateBia', plans: 'updatePlan', exercises: 'updateExercise' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = bcmStore[GETTERS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(BCM_FILES_DIR, att.storedName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  const attachments = (item.attachments || []).filter(a => a.id !== req.params.fileId)
  bcmStore[UPDATERS[col]](req.params.id, { attachments })
  res.json({ ok: true })
})

module.exports = router
