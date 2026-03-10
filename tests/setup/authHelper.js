'use strict'
const request = require('supertest')

const CREDENTIALS = {
  admin:        { username: 'admin',        password: 'adminpass'  },
  editor:       { username: 'editor',       password: 'editorpass' },
  reader:       { username: 'reader',       password: 'readerpass' },
  auditor:      { username: 'auditor',      password: 'auditorpass'},
  contentowner: { username: 'contentowner', password: 'copass'     },
}

/**
 * Loggt einen Testnutzer ein und gibt den Cookie-String zurück.
 * @param {import('express').Application} app
 * @param {'admin'|'editor'|'reader'|'auditor'|'contentowner'} role
 * @returns {Promise<string>} Cookie-String für den `Cookie:`-Header
 */
async function loginAs(app, role) {
  const creds = CREDENTIALS[role]
  if (!creds) throw new Error(`Unbekannte Rolle: ${role}`)

  const res = await request(app).post('/login').send(creds)
  if (res.status !== 200) {
    throw new Error(`Login als "${role}" fehlgeschlagen: HTTP ${res.status} – ${JSON.stringify(res.body)}`)
  }

  const setCookie = res.headers['set-cookie']
  if (!setCookie || !setCookie.length) {
    throw new Error(`Login als "${role}": kein Set-Cookie-Header in der Antwort`)
  }

  // Nur den Token-Teil zurückgeben (ohne Path, SameSite etc.)
  return setCookie[0].split(';')[0]  // "sm_session=<token>"
}

/**
 * Shortcut: GET-Request mit eingeloggtem Nutzer
 */
function authedGet(app, cookie, url) {
  return request(app).get(url).set('Cookie', cookie)
}

/**
 * Shortcut: POST-Request mit eingeloggtem Nutzer
 */
function authedPost(app, cookie, url, body) {
  return request(app).post(url).set('Cookie', cookie).send(body)
}

/**
 * Shortcut: PUT-Request mit eingeloggtem Nutzer
 */
function authedPut(app, cookie, url, body) {
  return request(app).put(url).set('Cookie', cookie).send(body)
}

/**
 * Shortcut: DELETE-Request mit eingeloggtem Nutzer
 */
function authedDelete(app, cookie, url) {
  return request(app).delete(url).set('Cookie', cookie)
}

module.exports = { loginAs, authedGet, authedPost, authedPut, authedDelete }
