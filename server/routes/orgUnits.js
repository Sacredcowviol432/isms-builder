// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// REST routes for IT Organisational Units
'use strict'
const express      = require('express')
const router       = express.Router()
const { requireAuth, authorize } = require('../auth')
const orgUnitStore = require('../db/orgUnitStore')
const auditStore   = require('../db/auditStore')

router.get('/org-units', requireAuth, authorize('reader'), (req, res) => {
  res.json(orgUnitStore.getAll())
})

router.get('/org-units/:id', requireAuth, authorize('reader'), (req, res) => {
  const u = orgUnitStore.getById(req.params.id)
  if (!u) return res.status(404).json({ error: 'Not found' })
  res.json(u)
})

router.post('/org-units', requireAuth, authorize('admin'), (req, res) => {
  try {
    const unit = orgUnitStore.create(req.body)
    auditStore.append({ user: req.user, action: 'create', resource: 'org-unit', detail: unit.name })
    res.status(201).json(unit)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/org-units/:id', requireAuth, authorize('admin'), (req, res) => {
  try {
    const updated = orgUnitStore.update(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: 'Not found' })
    auditStore.append({ user: req.user, action: 'update', resource: 'org-unit', detail: updated.name })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/org-units/:id', requireAuth, authorize('admin'), (req, res) => {
  try {
    const ok = orgUnitStore.remove(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    auditStore.append({ user: req.user, action: 'delete', resource: 'org-unit', detail: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
