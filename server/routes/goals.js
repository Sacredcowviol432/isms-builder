// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const goalsStore = require('../db/goalsStore')
const embeddingStore = require('../ai/embeddingStore')

router.get('/goals/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(goalsStore.getSummary())
})
router.get('/goals', requireAuth, authorize('reader'), (req, res) => {
  const { status, category, entity } = req.query
  res.json(goalsStore.getAll({ status, category, entity }))
})
router.get('/goals/:id', requireAuth, authorize('reader'), (req, res) => {
  const g = goalsStore.getById(req.params.id)
  if (!g) return res.status(404).json({ error: 'Not found' })
  res.json(g)
})
router.post('/goals', requireAuth, authorize('editor'), (req, res) => {
  const g = goalsStore.create(req.body, req.user)
  embeddingStore.indexDoc(g, 'Sicherheitsziel', '#goals').catch(() => {})
  res.status(201).json(g)
})
router.put('/goals/:id', requireAuth, authorize('editor'), (req, res) => {
  const g = goalsStore.update(req.params.id, req.body)
  if (!g) return res.status(404).json({ error: 'Not found' })
  embeddingStore.indexDoc(g, 'Sicherheitsziel', '#goals').catch(() => {})
  res.json(g)
})
router.delete('/goals/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = goalsStore.delete(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'goal', resourceId: req.params.id })
  res.json({ deleted: true })
})

router.delete('/goals/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  const ok = goalsStore.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'goal', resourceId: req.params.id })
  embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/goals/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = goalsStore.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'goal', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
