// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const publicIncidentStore = require('../db/publicIncidentStore')

// Öffentliche Gesellschaftsliste (kein Login nötig)
router.get('/public/entities', (req, res) => {
  try {
    const entityStore = require('../db/entityStore')
    res.json(entityStore.getAll().map(e => ({ id: e.id, name: e.name })))
  } catch { res.json([]) }
})

// Jeder kann einen Vorfall melden
router.post('/public/incident', (req, res) => {
  const { email, entityName, incidentType, description, measuresTaken, localContact, cleanedUp } = req.body || {}
  if (!email || !incidentType || !description) {
    return res.status(400).json({ error: 'email, incidentType und description sind Pflichtfelder.' })
  }
  const incident = publicIncidentStore.create({ email, entityName, incidentType, description, measuresTaken, localContact, cleanedUp })
  res.status(201).json({ ok: true, refNumber: incident.refNumber, id: incident.id })
})

// CISO / contentowner: Liste aller gemeldeten Vorfälle
router.get('/public/incidents', requireAuth, authorize('contentowner'), (req, res) => {
  const { status } = req.query
  res.json(publicIncidentStore.getAll(status ? { status } : {}))
})

// CISO / contentowner: Einzelnen Vorfall abrufen
router.get('/public/incident/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const item = publicIncidentStore.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

// CISO / contentowner: Vorfall zuweisen / aktualisieren
router.put('/public/incident/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const updated = publicIncidentStore.update(req.params.id, req.body, req.user)
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

// Admin: Vorfall in Papierkorb verschieben (Soft-Delete)
router.delete('/public/incident/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = publicIncidentStore.delete(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'public-incident', resourceId: req.params.id })
  res.json({ deleted: true })
})

// Admin: Vorfall endgültig löschen
router.delete('/public/incident/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  const ok = publicIncidentStore.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'public-incident', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})

// Admin: Vorfall wiederherstellen
router.post('/public/incident/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = publicIncidentStore.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'public-incident', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
