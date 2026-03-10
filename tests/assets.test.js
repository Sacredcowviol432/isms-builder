'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let assetId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-assets'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  removeTestDataDir(dataDir)
})

describe('Asset Management CRUD', () => {
  test('GET /assets – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /assets/summary – Zusammenfassung', async () => {
    const res = await authedGet(app, readerCookie, '/assets/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('byCategory')
    expect(res.body).toHaveProperty('byClassification')
    expect(res.body).toHaveProperty('byCriticality')
    expect(res.body).toHaveProperty('endOfLifeSoon')
    expect(res.body).toHaveProperty('criticalUnclassified')
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/assets', {
      name: 'Test Asset', category: 'hardware', criticality: 'low',
    })
    expect(res.status).toBe(403)
  })

  test('POST /assets – editor erstellt Asset', async () => {
    const res = await authedPost(app, editorCookie, '/assets', {
      name:           'Testserver Werk 2',
      category:       'hardware',
      type:           'hardware_server',
      description:    'Testserver für Integrationstests',
      classification: 'confidential',
      criticality:    'high',
      status:         'active',
      owner:          'Max Mustermann',
      ownerEmail:     'max@test.local',
      custodian:      'IT-Betrieb',
      vendor:         'HPE',
      version:        'DL380 Gen10',
      serialNumber:   'SRV-TEST-001',
      location:       'RZ Test, Rack A-01',
      purchaseDate:   '2024-01-01',
      endOfLifeDate:  '2029-12-31',
      tags:           ['test', 'server'],
      notes:          'Nur für Tests',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^asset_/)
    expect(res.body.name).toBe('Testserver Werk 2')
    expect(res.body.classification).toBe('confidential')
    expect(res.body.criticality).toBe('high')
    assetId = res.body.id
  })

  test('GET /assets – Liste enthält das neue Asset', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some(a => a.id === assetId)).toBe(true)
  })

  test('GET /assets/:id – einzelnes Asset', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${assetId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(assetId)
    expect(res.body.name).toBe('Testserver Werk 2')
    expect(res.body.owner).toBe('Max Mustermann')
  })

  test('GET /assets/:id – 404 bei unbekannter ID', async () => {
    const res = await authedGet(app, readerCookie, '/assets/asset_000000xx')
    expect(res.status).toBe(404)
  })

  test('PUT /assets/:id – editor aktualisiert Asset', async () => {
    const res = await authedPut(app, editorCookie, `/assets/${assetId}`, {
      name:     'Testserver Werk 2 (aktualisiert)',
      status:   'planned',
      notes:    'Aktualisierte Notiz',
    })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Testserver Werk 2 (aktualisiert)')
    expect(res.body.status).toBe('planned')
  })

  test('GET /assets mit Filter category=hardware', async () => {
    const res = await authedGet(app, readerCookie, '/assets?category=hardware')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.every(a => a.category === 'hardware')).toBe(true)
  })

  test('GET /assets mit Filter status=planned', async () => {
    const res = await authedGet(app, readerCookie, '/assets?status=planned')
    expect(res.status).toBe(200)
    expect(res.body.some(a => a.id === assetId)).toBe(true)
  })

  test('GET /assets/summary – zählt korrekten Total', async () => {
    const res = await authedGet(app, readerCookie, '/assets/summary')
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  test('editor darf NICHT löschen (403)', async () => {
    const res = await authedDelete(app, editorCookie, `/assets/${assetId}`)
    expect(res.status).toBe(403)
  })

  test('DELETE /assets/:id – admin löscht (soft-delete)', async () => {
    const res = await authedDelete(app, adminCookie, `/assets/${assetId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /assets/:id – 404 nach soft-delete', async () => {
    const res = await authedGet(app, readerCookie, `/assets/${assetId}`)
    expect(res.status).toBe(404)
  })

  test('GET /assets enthält gelöschtes Asset nicht mehr', async () => {
    const res = await authedGet(app, readerCookie, '/assets')
    expect(res.status).toBe(200)
    expect(res.body.some(a => a.id === assetId)).toBe(false)
  })

  test('DELETE /assets/:id – 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/assets/asset_000000xx')
    expect(res.status).toBe(404)
  })

  test('unauthentifizierter Zugriff gesperrt (401)', async () => {
    const request = require('supertest')
    const res = await request(app).get('/assets')
    expect([401, 403]).toContain(res.status)
  })
})
