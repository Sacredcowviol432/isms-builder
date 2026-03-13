// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Policy Acknowledgement Routes (authenticated)

const express  = require('express')
const router   = express.Router()
const { requireAuth, authorize } = require('../auth')
const ackStore    = require('../db/ackStore')
const orgSettings = require('../db/orgSettingsStore')
const mailer      = require('../mailer')
const storage     = require('../storage')

// ── Helper ────────────────────────────────────────────────────────────────────

function getMode() {
  return orgSettings.get().policyAckMode || 'manual'
}

function buildTokenUrl(req, token) {
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')
  const host  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  return `${proto}://${host}/ack/${token}`
}

async function sendCampaignMails(dist, req) {
  const acks = ackStore.getAcksForDistribution(dist.id)
  let sent = 0
  for (const ack of acks) {
    if (ack.acknowledgedAt) continue  // already confirmed — skip
    const url     = buildTokenUrl(req, ack.token)
    const subject = `[ISMS] Bitte bestätigen: ${dist.templateTitle}`
    const html    = `
      <p>Guten Tag,</p>
      <p>Sie werden gebeten, folgende Richtlinie zur Kenntnis zu nehmen und zu bestätigen:</p>
      <p><strong>${dist.templateTitle}</strong></p>
      ${dist.dueDate ? `<p>Frist: <strong>${new Date(dist.dueDate).toLocaleDateString('de-DE')}</strong></p>` : ''}
      <p><a href="${url}" style="background:#0052cc;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">
        Richtlinie lesen &amp; bestätigen
      </a></p>
      <p style="color:#666;font-size:12px">
        Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>${url}
      </p>
      <hr>
      <p style="color:#888;font-size:11px">Diese E-Mail wurde automatisch vom ISMS Builder generiert.</p>
    `
    const ok = await mailer.sendMail(ack.recipientEmail, subject, html)
    if (ok) sent++
  }
  return sent
}

// ── GET /admin/ack-settings — aktueller Modus ─────────────────────────────────
router.get('/admin/ack-settings', requireAuth, authorize('admin'), (req, res) => {
  res.json({ policyAckMode: getMode() })
})

// ── PUT /admin/ack-settings — Modus ändern (nur admin) ───────────────────────
router.put('/admin/ack-settings', requireAuth, authorize('admin'), (req, res) => {
  const { policyAckMode } = req.body
  const VALID = ['email_campaign', 'manual', 'distribution_only']
  if (!VALID.includes(policyAckMode)) return res.status(400).json({ error: 'Ungültiger Modus' })
  orgSettings.update({ policyAckMode })
  res.json({ ok: true, policyAckMode })
})

// ── GET /distributions — alle Verteilrunden (contentowner+) ──────────────────
router.get('/distributions', requireAuth, authorize('contentowner'), (req, res) => {
  res.json(ackStore.getAllDistributionsWithStats())
})

// ── GET /distributions/summary — KPI für Dashboard ───────────────────────────
router.get('/distributions/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(ackStore.getSummary())
})

// ── GET /distributions/:id — Detail + Stats ───────────────────────────────────
router.get('/distributions/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const dist = ackStore.getDistributionWithStats(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(dist)
})

// ── POST /distributions — neue Verteilrunde anlegen ──────────────────────────
router.post('/distributions', requireAuth, authorize('contentowner'), async (req, res) => {
  const { templateId, dueDate, targetGroup, emailList, notes } = req.body
  if (!templateId) return res.status(400).json({ error: 'templateId fehlt' })

  const mode = getMode()

  // Vorlage laden für Titel/Typ/Version
  let templateTitle = '', templateType = 'Policy', templateVersion = 1
  try {
    const all = storage.getTemplates({}) || []
    const tmpl = all.find(t => t.id === templateId)
    if (tmpl) {
      templateTitle   = tmpl.title || ''
      templateType    = tmpl.type  || 'Policy'
      templateVersion = tmpl.version || 1
      if (tmpl.status !== 'approved') {
        return res.status(400).json({ error: 'Nur freigegebene (approved) Richtlinien können verteilt werden' })
      }
    }
  } catch {}

  const dist = ackStore.createDistribution({
    templateId,
    templateTitle,
    templateType,
    templateVersion,
    mode,
    targetGroup: targetGroup || '',
    dueDate:     dueDate     || null,
    emailList:   mode === 'email_campaign' ? (emailList || []) : [],
    notes:       notes       || '',
    createdBy:   req.user?.username || req.user?.email || 'system',
  })

  // Für E-Mail-Modus: Ack-Records vorbereiten
  if (mode === 'email_campaign' && dist.emailList.length > 0) {
    ackStore.prepareEmailAcks(dist.id, dist.emailList)
  }

  res.status(201).json(ackStore.getDistributionWithStats(dist.id))
})

// ── PUT /distributions/:id — bearbeiten (status, dueDate, notes) ─────────────
router.put('/distributions/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const allowed = ['status', 'dueDate', 'targetGroup', 'notes']
  const patch = {}
  for (const k of allowed) { if (req.body[k] !== undefined) patch[k] = req.body[k] }
  const updated = ackStore.updateDistribution(req.params.id, patch)
  if (!updated) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(ackStore.getDistributionWithStats(updated.id))
})

// ── DELETE /distributions/:id — löschen (admin) ──────────────────────────────
router.delete('/distributions/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = ackStore.deleteDistribution(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json({ ok: true })
})

// ── POST /distributions/:id/send — E-Mails versenden (email_campaign) ─────────
router.post('/distributions/:id/send', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  if (dist.mode !== 'email_campaign') return res.status(400).json({ error: 'Nur für E-Mail-Kampagnen' })

  // Ggf. neue E-Mail-Adressen aus Anfrage hinzufügen
  if (Array.isArray(req.body.emailList) && req.body.emailList.length > 0) {
    const merged = [...new Set([...dist.emailList, ...req.body.emailList])]
    ackStore.updateDistribution(dist.id, { emailList: merged })
    ackStore.prepareEmailAcks(dist.id, merged)
  } else {
    ackStore.prepareEmailAcks(dist.id, dist.emailList)
  }

  const fresh = ackStore.getDistribution(dist.id)
  const sent  = await sendCampaignMails(fresh, req)
  ackStore.updateDistribution(dist.id, { emailSentAt: new Date().toISOString(), emailSentCount: (fresh.emailSentCount || 0) + sent })
  res.json({ ok: true, sent })
})

// ── POST /distributions/:id/remind — Erinnerung an nicht bestätigte ───────────
router.post('/distributions/:id/remind', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  if (dist.mode !== 'email_campaign') return res.status(400).json({ error: 'Nur für E-Mail-Kampagnen' })
  const sent = await sendCampaignMails(dist, req)
  res.json({ ok: true, sent })
})

// ── GET /distributions/:id/acks — alle Bestätigungen ─────────────────────────
router.get('/distributions/:id/acks', requireAuth, authorize('contentowner'), (req, res) => {
  const dist = ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(ackStore.getAcksForDistribution(req.params.id))
})

// ── POST /distributions/:id/acks — manuelle Bestätigung hinzufügen ─────────────
router.post('/distributions/:id/acks', requireAuth, authorize('contentowner'), (req, res) => {
  const dist = ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const { recipientEmail, recipientName, acknowledgedAt, notes } = req.body
  const ack = ackStore.addManualAck({
    distributionId: req.params.id,
    recipientEmail:  recipientEmail || '',
    recipientName:   recipientName  || '',
    acknowledgedAt:  acknowledgedAt || null,
    notes:           notes          || '',
    addedBy:         req.user?.username || req.user?.email || 'system',
  })
  res.status(201).json(ack)
})

// ── POST /distributions/:id/acks/import — CSV-Import ─────────────────────────
router.post('/distributions/:id/acks/import', requireAuth, authorize('contentowner'), (req, res) => {
  const dist = ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const { rows } = req.body  // [{ email, name, acknowledgedAt }]
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows[] erwartet' })
  const result = ackStore.importAcks(
    req.params.id,
    rows,
    req.user?.username || req.user?.email || 'system'
  )
  res.json(result)
})

// ── DELETE /distributions/:id/acks/:ackId — einzelne Bestätigung löschen ──────
router.delete('/distributions/:id/acks/:ackId', requireAuth, authorize('admin'), (req, res) => {
  const ok = ackStore.deleteAck(req.params.ackId)
  if (!ok) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json({ ok: true })
})

// ── GET /distributions/:id/export/csv — CSV-Export ───────────────────────────
router.get('/distributions/:id/export/csv', requireAuth, authorize('contentowner'), (req, res) => {
  const dist = ackStore.getDistributionWithStats(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const acks = ackStore.getAcksForDistribution(req.params.id)

  const header = 'E-Mail;Name;Bestätigt am;Methode\n'
  const rows = acks.map(a =>
    [
      a.recipientEmail || '',
      a.recipientName  || '',
      a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString('de-DE') : 'Ausstehend',
      a.method         || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
  ).join('\n')

  const filename = `Bestaetigungen_${dist.templateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + header + rows)
})

module.exports = router
