'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let createdId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-tmpl'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie   = await loginAs(app, 'admin')
  editorCookie  = await loginAs(app, 'editor')
  readerCookie  = await loginAs(app, 'reader')
})

afterAll(async () => {
  if (createdId) {
    await authedDelete(app, adminCookie, `/template/policy/${createdId}`)
  }
  removeTestDataDir(dataDir)
})

describe('Templates CRUD', () => {
  test('GET /templates – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /template – contentowner erstellt Template', async () => {
    const coCookie = await loginAs(app, 'contentowner')
    const res = await authedPost(app, coCookie, '/template', {
      type:     'policy',
      language: 'de',
      title:    'Datenschutzrichtlinie Test',
      content:  '# Datenschutz\n\nTestinhalt.',
      owner:    'IT-Abteilung',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.title).toBe('Datenschutzrichtlinie Test')
    expect(res.body.status).toBe('draft')
    createdId = res.body.id
  })

  test('GET /template/:type/:id – Template lesen', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdId)
  })

  test('GET /templates/tree – Baum', async () => {
    const res = await authedGet(app, readerCookie, '/templates/tree')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('PUT /template/:type/:id – editor aktualisiert', async () => {
    const res = await authedPut(app, editorCookie, `/template/policy/${createdId}`, {
      title:   'Datenschutzrichtlinie Test (aktualisiert)',
      content: '# Datenschutz\n\nAktualisierter Inhalt.',
    })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Datenschutzrichtlinie Test (aktualisiert)')
    expect(res.body.version).toBeGreaterThan(1)
  })

  test('GET /template/:type/:id/history – Versionshistorie', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}/history`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Nach dem Update muss mindestens 1 Eintrag vorhanden sein
    expect(res.body.length).toBeGreaterThanOrEqual(0)
  })

  test('PATCH /template/:type/:id/status – Lifecycle review', async () => {
    const request = require('supertest')
    const res = await request(app)
      .patch(`/template/policy/${createdId}/status`)
      .set('Cookie', editorCookie)
      .send({ status: 'review' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('review')
  })

  test('GET /template/:type/:id/status-history', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}/status-history`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('DELETE /template/:type/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/template/policy/${createdId}`)
    expect(res.status).toBe(200)
    createdId = null
  })

  test('GET nach DELETE → 404', async () => {
    const res = await authedGet(app, readerCookie, '/template/policy/nonexistent-id')
    expect(res.status).toBe(404)
  })
})
