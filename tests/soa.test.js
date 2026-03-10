'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPut } = require('./setup/authHelper')

// Reale Control-IDs aus dem soaStore-Seed (ISO27001)
const CTRL_1 = 'ISO-5.1'
const CTRL_2 = 'ISO-5.2'

let dataDir, app, readerCookie, editorCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  // soa.json als leeres Objekt — soaStore baut seinen Seed automatisch auf

  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-soa'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  readerCookie = await loginAs(app, 'reader')
  editorCookie = await loginAs(app, 'editor')
})

afterAll(() => removeTestDataDir(dataDir))

describe('SoA – Lesen', () => {
  test('GET /soa – gibt alle Controls zurück', async () => {
    const res = await authedGet(app, readerCookie, '/soa')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /soa?framework=ISO27001 – Filter funktioniert', async () => {
    const res = await authedGet(app, readerCookie, '/soa?framework=ISO27001')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every(c => c.framework === 'ISO27001')).toBe(true)
  })

  test('GET /soa/summary – gibt Zusammenfassung', async () => {
    const res = await authedGet(app, readerCookie, '/soa/summary')
    expect(res.status).toBe(200)
  })

  test('GET /soa/frameworks – gibt Framework-Liste', async () => {
    const res = await authedGet(app, readerCookie, '/soa/frameworks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /soa/export – JSON-Export', async () => {
    const res = await authedGet(app, readerCookie, '/soa/export')
    expect(res.status).toBe(200)
  })
})

describe('SoA – Bearbeiten', () => {
  test('PUT /soa/:id – editor aktualisiert Control', async () => {
    const res = await authedPut(app, editorCookie, `/soa/${CTRL_1}`, {
      status:        'planned',
      applicability: 'Gilt für alle Standorte',
      owner:         'CISO',
      justification: 'In Umsetzung Q3 2026',
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('planned')
    expect(res.body.owner).toBe('CISO')
  })

  test('reader darf NICHT aktualisieren (403)', async () => {
    const res = await authedPut(app, readerCookie, `/soa/${CTRL_2}`, { status: 'planned' })
    expect(res.status).toBe(403)
  })
})

describe('SoA – Cross-Mapping', () => {
  test('GET /soa/crossmap – gibt Mapping-Gruppen', async () => {
    const res = await authedGet(app, readerCookie, '/soa/crossmap')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
