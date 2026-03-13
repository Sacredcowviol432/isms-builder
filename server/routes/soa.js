// © 2026 Claude Hecker — ISMS Builder V 1.30 — AGPL-3.0
'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const soaStore = require('../db/soaStore')
const crossmapStore = require('../db/crossmapStore')
const orgSettingsStore = require('../db/orgSettingsStore')
const auditStore = require('../db/auditStore')
const storage = require('../storage')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')

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

// ─────────────────────────────────────────────────────────────────
// ISO Controls Import
// ISO 27001 / ISO 9000 / ISO 9001 controls are NOT included in the
// distribution (copyright). Users supply their own JSON file.
// ─────────────────────────────────────────────────────────────────

// Status: check whether iso-controls.json exists and how many controls it has
router.get('/soa/import-controls/status', requireAuth, authorize('reader'), (req, res) => {
  const isoFile = path.join(DATA_DIR, 'iso-controls.json')
  if (!fs.existsSync(isoFile)) {
    return res.json({ present: false, count: 0 })
  }
  try {
    const raw = JSON.parse(fs.readFileSync(isoFile, 'utf8'))
    const count = Array.isArray(raw) ? raw.length : 0
    res.json({ present: true, count })
  } catch (e) {
    res.json({ present: true, count: 0, error: 'Parse error: ' + e.message })
  }
})

// Import: write iso-controls.json and reload the store
router.post('/soa/import-controls', requireAuth, authorize('admin'), express.json({ limit: '10mb' }), (req, res) => {
  const controls = req.body
  if (!Array.isArray(controls)) return res.status(400).json({ error: 'Expected JSON array of controls' })
  // Validate: each must have id, theme, title, framework
  const valid = controls.filter(c => c.id && c.theme && c.title && c.framework)
  if (valid.length === 0) return res.status(400).json({ error: 'No valid controls found' })
  const isoFile = path.join(DATA_DIR, 'iso-controls.json')
  fs.writeFileSync(isoFile, JSON.stringify(valid, null, 2))
  soaStore.init()  // reload
  auditStore.append({ user: req.user, action: 'import', resource: 'iso-controls', detail: `Imported ${valid.length} ISO controls` })
  res.json({ imported: valid.length })
})

// ── Custom Controls ───────────────────────────────────────────────────────────

router.post('/soa/custom', requireAuth, authorize('contentowner'), (req, res) => {
  try {
    const ctrl = soaStore.createCustomControl(req.body, { changedBy: req.user })
    auditStore.append({ user: req.user, action: 'create', resource: 'custom-control', detail: ctrl.title })
    res.status(201).json(ctrl)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.put('/soa/custom/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const updated = soaStore.updateCustomControl(req.params.id, req.body, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Not found or not a custom control' })
  auditStore.append({ user: req.user, action: 'update', resource: 'custom-control', detail: updated.title })
  res.json(updated)
})

router.delete('/soa/custom/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const result = soaStore.deleteCustomControl(req.params.id)
  if (!result.ok) {
    if (result.reason === 'not_found')  return res.status(404).json({ error: 'Not found' })
    if (result.reason === 'not_custom') return res.status(403).json({ error: 'Cannot delete built-in controls' })
    if (result.reason === 'has_links')  return res.status(409).json({ error: 'Control is linked to templates — unlink first' })
  }
  auditStore.append({ user: req.user, action: 'delete', resource: 'custom-control', detail: req.params.id })
  res.json({ ok: true })
})

module.exports = router
