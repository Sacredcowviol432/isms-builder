// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const soaStore = require('../db/soaStore')
const crossmapStore = require('../db/crossmapStore')
const orgSettingsStore = require('../db/orgSettingsStore')
const auditStore = require('../db/auditStore')
const storage = require('../storage')

// Verfügbare Frameworks auflisten
router.get('/soa/frameworks', requireAuth, authorize('reader'), (req, res) => {
  const activeFw = orgSettingsStore.get().soaFrameworks || {}
  const all = soaStore.getFrameworks()
  const hasConfig = Object.values(activeFw).some(v => v === false)
  res.json(hasConfig ? all.filter(fw => activeFw[fw.id] !== false) : all)
})

// Alle Controls
router.get('/soa', requireAuth, authorize('reader'), (req, res) => {
  const { framework, theme } = req.query
  res.json(soaStore.getAll({ framework, theme }))
})

// Zusammenfassung
router.get('/soa/summary', requireAuth, authorize('reader'), (req, res) => {
  const { framework } = req.query
  const activeFw = orgSettingsStore.get().soaFrameworks || {}
  const hasConfig = Object.values(activeFw).some(v => v === false)
  const full = soaStore.getSummary(framework || null)
  if (!framework && hasConfig) {
    const filtered = {}
    for (const [k, v] of Object.entries(full)) {
      if (activeFw[k] !== false) filtered[k] = v
    }
    return res.json(filtered)
  }
  res.json(full)
})

// Framework-Selektion lesen
router.get('/admin/soa-frameworks', requireAuth, authorize('reader'), (req, res) => {
  res.json(orgSettingsStore.get().soaFrameworks || {})
})

// Framework-Selektion speichern
router.put('/admin/soa-frameworks', requireAuth, authorize('admin'), (req, res) => {
  const updated = orgSettingsStore.update({ soaFrameworks: req.body })
  auditStore.append({ user: req.user, action: 'settings', resource: 'soa-frameworks', detail: 'SoA Framework-Auswahl aktualisiert' })
  res.json(updated.soaFrameworks)
})

// Einzelnen Control aktualisieren
router.put('/soa/:id', requireAuth, authorize('editor'), (req, res) => {
  const { id } = req.params
  const { applicable, status, owner, justification, linkedTemplates, applicableEntities } = req.body

  if (Array.isArray(linkedTemplates)) {
    const existing = soaStore.getById(id)
    if (existing) {
      const prevTemplates = existing.linkedTemplates || []
      const added   = linkedTemplates.filter(t => !prevTemplates.includes(t))
      const removed = prevTemplates.filter(t => !linkedTemplates.includes(t))
      for (const tid of added) {
        const ttype = tid.split('_')[0]
        storage.addLinkedControl?.(ttype, tid, id)
      }
      for (const tid of removed) {
        const ttype = tid.split('_')[0]
        storage.removeLinkedControl?.(ttype, tid, id)
      }
    }
  }

  const updated = soaStore.update(id, { applicable, status, owner, justification, linkedTemplates, applicableEntities }, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Control not found' })
  res.json(updated)
})

// Cross-Mapping: alle Gruppen
router.get('/soa/crossmap', requireAuth, authorize('reader'), (req, res) => {
  res.json(crossmapStore.getAll())
})

// Cross-Mapping: verwandte Controls
router.get('/soa/:id/crossmap', requireAuth, authorize('reader'), (req, res) => {
  const { id } = req.params
  res.json(crossmapStore.getRelated(id))
})

// JSON-Export
router.get('/soa/export', requireAuth, authorize('reader'), (req, res) => {
  const all = soaStore.getAll()
  const summary = soaStore.getSummary()
  res.setHeader('Content-Disposition', 'attachment; filename="soa-export.json"')
  res.json({ exportedAt: new Date().toISOString(), summary, controls: all })
})

module.exports = router
