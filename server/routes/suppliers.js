// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const supplierStore = require('../db/supplierStore')
const embeddingStore = require('../ai/embeddingStore')

router.get('/suppliers/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(supplierStore.getSummary())
})

router.get('/suppliers', requireAuth, authorize('reader'), (req, res) => {
  res.json(supplierStore.getAll(req.query))
})

router.get('/suppliers/:id', requireAuth, authorize('reader'), (req, res) => {
  const s = supplierStore.getById(req.params.id)
  if (!s) return res.status(404).json({ error: 'Not found' })
  res.json(s)
})

router.post('/suppliers', requireAuth, authorize('editor'), (req, res) => {
  try {
    const item = supplierStore.create(req.body, { createdBy: req.user })
    require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'supplier', detail: item.name })
    embeddingStore.indexDoc({ ...item, title: item.name }, 'Lieferant', '#suppliers').catch(() => {})
    res.status(201).json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/suppliers/:id', requireAuth, authorize('editor'), (req, res) => {
  try {
    const updated = supplierStore.update(req.params.id, req.body, { changedBy: req.user })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'supplier', detail: updated.name })
    embeddingStore.indexDoc({ ...updated, title: updated.name }, 'Lieferant', '#suppliers').catch(() => {})
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/suppliers/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  try {
    const ok = supplierStore.permanentDelete(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'supplier', detail: req.params.id })
    embeddingStore.removeDoc(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/suppliers/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  try {
    const item = supplierStore.restore(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'supplier', detail: item.name })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/suppliers/:id', requireAuth, authorize('admin'), (req, res) => {
  try {
    const ok = supplierStore.remove(req.params.id, { deletedBy: req.user })
    if (!ok) return res.status(404).json({ error: 'Not found' })
    require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'supplier', detail: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
