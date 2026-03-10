// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const legalStore = require('../db/legalStore')

const LEGAL_FILES_DIR = legalStore.FILES_DIR
if (!fs.existsSync(LEGAL_FILES_DIR)) fs.mkdirSync(LEGAL_FILES_DIR, { recursive: true })

const legalAttachUpload = multer({
  dest: LEGAL_FILES_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.png', '.jpg', '.jpeg', '.txt', '.zip']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Dateityp nicht erlaubt (PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT, ZIP)'))
  }
})

function legalAttachRoutes(resourceKey, store) {
  router.post(`/legal/${resourceKey}/:id/attachments`, requireAuth, authorize('contentowner'), (req, res) => {
    legalAttachUpload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message })
      if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' })
      const item = store.getById(req.params.id)
      if (!item) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'Not found' }) }
      const meta = {
        id: `att_${Date.now()}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedBy: req.user,
        uploadedAt: new Date().toISOString(),
        filePath: req.file.path
      }
      store.addAttachment(req.params.id, meta)
      res.status(201).json(meta)
    })
  })
  router.get(`/legal/${resourceKey}/:id/attachments/:attId/file`, requireAuth, authorize('reader'), (req, res) => {
    const item = store.getById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    const att = (item.attachments || []).find(a => a.id === req.params.attId)
    if (!att || !att.filePath || !fs.existsSync(att.filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' })
    const ext = path.extname(att.originalName || '').toLowerCase()
    const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain' }
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${att.originalName}"`)
    res.sendFile(path.resolve(att.filePath))
  })
  router.delete(`/legal/${resourceKey}/:id/attachments/:attId`, requireAuth, authorize('contentowner'), (req, res) => {
    const att = store.removeAttachment(req.params.id, req.params.attId)
    if (!att) return res.status(404).json({ error: 'Not found' })
    if (att.filePath) fs.unlink(att.filePath, () => {})
    res.json({ deleted: true })
  })
}

legalAttachRoutes('contracts', legalStore.contracts)
legalAttachRoutes('ndas',      legalStore.ndas)
legalAttachRoutes('policies',  legalStore.privacyPolicies)

router.get('/legal/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(legalStore.getSummary())
})

// ── CSV-Hilfsfunktion ────────────────────────────────────────────────
function toCsv(rows) {
  return rows.map(r => r.map(c => {
    const s = c === null || c === undefined ? '' : String(c)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')).join('\r\n')
}

// Verträge
router.get('/legal/contracts/export/csv', requireAuth, authorize('reader'), (req, res) => {
  const list = legalStore.contracts.getAll(req.query)
  const header = ['ID','Titel','Typ','Vertragspartner','Status','Laufzeitbeginn','Laufzeitende','Automatische Verlängerung','Kündigungsfrist (Tage)','Wert','Währung','Owner','Notizen','Erstellt am']
  const rows = list.map(c => [
    c.id, c.title, c.contractType, c.counterparty, c.status,
    c.startDate || '', c.endDate || '',
    c.autoRenew ? 'Ja' : 'Nein', c.noticePeriodDays || '',
    c.value || '', c.currency || 'EUR', c.owner || '',
    c.notes || '', c.createdAt ? c.createdAt.slice(0, 10) : ''
  ])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="legal-contracts-${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('\uFEFF' + toCsv([header, ...rows]))
})

router.get('/legal/contracts', requireAuth, authorize('reader'), (req, res) => {
  res.json(legalStore.contracts.getAll(req.query))
})
router.get('/legal/contracts/expiring', requireAuth, authorize('reader'), (req, res) => {
  res.json(legalStore.contracts.getExpiring(parseInt(req.query.days) || 60))
})
router.get('/legal/contracts/:id', requireAuth, authorize('reader'), (req, res) => {
  const item = legalStore.contracts.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/legal/contracts', requireAuth, authorize('contentowner'), (req, res) => {
  res.status(201).json(legalStore.contracts.create(req.body, req.user))
})
router.put('/legal/contracts/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const item = legalStore.contracts.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/legal/contracts/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.contracts.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'legal_contract', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/legal/contracts/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.contracts.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'legal_contract', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/legal/contracts/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = legalStore.contracts.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'legal_contract', resourceId: req.params.id })
  res.json(item)
})

// NDAs
router.get('/legal/ndas/export/csv', requireAuth, authorize('reader'), (req, res) => {
  const list = legalStore.ndas.getAll(req.query)
  const header = ['ID','Titel','Typ','Vertragspartner','Status','Unterzeichnet am','Läuft ab','Umfang','Owner','Notizen','Erstellt am']
  const rows = list.map(n => [
    n.id, n.title, n.ndaType, n.counterparty, n.status,
    n.signingDate || '', n.expiryDate || '',
    n.scope || '', n.owner || '', n.notes || '',
    n.createdAt ? n.createdAt.slice(0, 10) : ''
  ])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="legal-ndas-${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('\uFEFF' + toCsv([header, ...rows]))
})

router.get('/legal/ndas', requireAuth, authorize('reader'), (req, res) => {
  res.json(legalStore.ndas.getAll(req.query))
})
router.get('/legal/ndas/:id', requireAuth, authorize('reader'), (req, res) => {
  const item = legalStore.ndas.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/legal/ndas', requireAuth, authorize('contentowner'), (req, res) => {
  res.status(201).json(legalStore.ndas.create(req.body, req.user))
})
router.put('/legal/ndas/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const item = legalStore.ndas.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/legal/ndas/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.ndas.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'legal_nda', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/legal/ndas/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.ndas.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'legal_nda', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/legal/ndas/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = legalStore.ndas.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'legal_nda', resourceId: req.params.id })
  res.json(item)
})

// Privacy Policies
router.get('/legal/policies/export/csv', requireAuth, authorize('reader'), (req, res) => {
  const list = legalStore.privacyPolicies.getAll(req.query)
  const header = ['ID','Titel','Typ','Status','Version','Veröffentlicht am','Nächstes Review','URL','Owner','Notizen','Erstellt am']
  const rows = list.map(p => [
    p.id, p.title, p.policyType, p.status, p.version || 1,
    p.publishedAt || '', p.nextReviewDate || '',
    p.url || '', p.owner || '', p.notes || '',
    p.createdAt ? p.createdAt.slice(0, 10) : ''
  ])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="legal-policies-${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('\uFEFF' + toCsv([header, ...rows]))
})

router.get('/legal/policies', requireAuth, authorize('reader'), (req, res) => {
  res.json(legalStore.privacyPolicies.getAll(req.query))
})
router.get('/legal/policies/:id', requireAuth, authorize('reader'), (req, res) => {
  const item = legalStore.privacyPolicies.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/legal/policies', requireAuth, authorize('contentowner'), (req, res) => {
  res.status(201).json(legalStore.privacyPolicies.create(req.body, req.user))
})
router.put('/legal/policies/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const item = legalStore.privacyPolicies.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/legal/policies/:id', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.privacyPolicies.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'legal_policy', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/legal/policies/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  if (!legalStore.privacyPolicies.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'legal_policy', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/legal/policies/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = legalStore.privacyPolicies.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'legal_policy', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
