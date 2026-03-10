// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const assetStore = require('../db/assetStore')
const embeddingStore = require('../ai/embeddingStore')

router.get('/assets/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(assetStore.getSummary())
})

router.get('/assets', requireAuth, authorize('reader'), (req, res) => {
  res.json(assetStore.getAll(req.query))
})

router.get('/assets/:id', requireAuth, authorize('reader'), (req, res) => {
  const a = assetStore.getById(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json(a)
})

router.post('/assets', requireAuth, authorize('editor'), (req, res) => {
  const asset = assetStore.create(req.body, { createdBy: req.user })
  require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'asset', detail: asset.name })
  embeddingStore.indexDoc({ ...asset, title: asset.name }, 'Asset', '#assets').catch(() => {})
  res.status(201).json(asset)
})

router.put('/assets/:id', requireAuth, authorize('editor'), (req, res) => {
  const updated = assetStore.update(req.params.id, req.body, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'asset', detail: updated.name })
  embeddingStore.indexDoc({ ...updated, title: updated.name }, 'Asset', '#assets').catch(() => {})
  res.json(updated)
})

router.delete('/assets/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = assetStore.remove(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'asset', detail: req.params.id })
  res.json({ ok: true })
})

module.exports = router
