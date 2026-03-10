// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
/**
 * mailer.js – Nodemailer wrapper
 *
 * SMTP-Konfiguration wird in zwei Stufen geladen (höhere Stufe hat Vorrang):
 *   1. Umgebungsvariablen: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   2. Admin-UI: org-settings.json → smtpSettings (wird bei jedem Senden neu gelesen)
 *
 * Sind weder Umgebungsvariablen noch UI-Einstellungen gesetzt, sind alle
 * Operationen stille No-Ops (kein Fehler, Tests unberührt).
 */

const nodemailer = require('nodemailer')

/**
 * Liest die aktuelle SMTP-Konfiguration.
 * Umgebungsvariablen haben immer Vorrang vor UI-Einstellungen.
 * @returns {{ host, port, secure, user, pass, from } | null}
 */
function getSmtpConfig() {
  // Stufe 1: Umgebungsvariablen
  if (process.env.SMTP_HOST) {
    return {
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user:   process.env.SMTP_USER   || '',
      pass:   process.env.SMTP_PASS   || '',
      from:   process.env.SMTP_FROM   || 'ISMS Builder <no-reply@isms.local>',
    }
  }

  // Stufe 2: org-settings (Admin-UI, wird dynamisch geladen)
  try {
    const orgSettings = require('./db/orgSettingsStore')
    const s = orgSettings.get().smtpSettings || {}
    if (s.host) {
      return {
        host:   s.host,
        port:   Number(s.port) || 587,
        secure: Boolean(s.secure),
        user:   s.user || '',
        pass:   s.pass || '',
        from:   s.from || 'ISMS Builder <no-reply@isms.local>',
      }
    }
  } catch { /* org-settings nicht verfügbar (z.B. Tests) */ }

  return null
}

/**
 * Erstellt einen frischen Nodemailer-Transport basierend auf aktueller Konfig.
 * Kein Caching, damit Änderungen via Admin-UI sofort wirksam sind.
 */
function createTransport(cfg) {
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  })
}

/**
 * Sendet eine HTML-E-Mail.
 * @param {string} to      – Empfänger
 * @param {string} subject – Betreff
 * @param {string} html    – HTML-Body
 * @returns {Promise<boolean>} true = gesendet, false = übersprungen
 */
async function sendMail(to, subject, html) {
  const cfg = getSmtpConfig()
  if (!cfg || !to) return false

  try {
    const transport = createTransport(cfg)
    await transport.sendMail({ from: cfg.from, to, subject, html })
    console.log(`[mailer] Gesendet: "${subject}" → ${to}`)
    return true
  } catch (err) {
    console.error(`[mailer] Fehler: "${subject}" → ${to}: ${err.message}`)
    return false
  }
}

/**
 * Sendet eine Test-Mail an die angegebene Adresse.
 * Gibt bei Erfolg true zurück, bei Fehler wirft sie.
 */
async function sendTestMail(to) {
  const cfg = getSmtpConfig()
  if (!cfg) throw new Error('SMTP nicht konfiguriert')

  const transport = createTransport(cfg)
  await transport.sendMail({
    from:    cfg.from,
    to,
    subject: '[ISMS Builder] Test-E-Mail',
    html:    `<p>Diese Test-Mail bestätigt, dass die SMTP-Konfiguration korrekt ist.</p>
              <p style="color:#666;font-size:12px">Gesendet von ISMS Builder – ${new Date().toLocaleString('de-DE')}</p>`,
  })
  return true
}

/** Gibt true zurück wenn SMTP konfiguriert ist (env oder org-settings) */
function isConfigured() {
  return Boolean(getSmtpConfig())
}

module.exports = { sendMail, sendTestMail, isConfigured, getSmtpConfig }
