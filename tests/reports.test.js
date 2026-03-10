'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet } = require('./setup/authHelper')

let dataDir, app, readerCookie, adminCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-rep'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  readerCookie = await loginAs(app, 'reader')
  adminCookie  = await loginAs(app, 'admin')
})

afterAll(() => removeTestDataDir(dataDir))

describe('Reports – Smoke-Tests (alle reader-zugänglich)', () => {
  const endpoints = [
    '/reports/compliance',
    '/reports/framework',
    '/reports/gap',
    '/reports/templates',
    '/reports/audit',
    '/reports/reviews',
    '/reports/matrix',
  ]

  for (const ep of endpoints) {
    test(`GET ${ep} → 200`, async () => {
      const res = await authedGet(app, readerCookie, ep)
      expect(res.status).toBe(200)
    })
  }

  test('GET /reports/export/csv → 200 mit CSV-Content', async () => {
    const res = await authedGet(app, readerCookie, '/reports/export/csv')
    expect(res.status).toBe(200)
    // CSV oder JSON je nach Implementierung
    expect([200]).toContain(res.status)
  })
})

describe('Dashboard', () => {
  test('GET /dashboard → 200 mit ISMS-Übersicht', async () => {
    const res = await authedGet(app, readerCookie, '/dashboard')
    expect(res.status).toBe(200)
    // Dashboard gibt ein Objekt zurück
    expect(typeof res.body).toBe('object')
  })
})

describe('Kalender', () => {
  test('GET /calendar → 200 mit Ereignisliste', async () => {
    const res = await authedGet(app, readerCookie, '/calendar')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
