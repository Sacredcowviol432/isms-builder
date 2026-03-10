'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let goalId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-goals'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  if (goalId) await authedDelete(app, adminCookie, `/goals/${goalId}`)
  removeTestDataDir(dataDir)
})

describe('Sicherheitsziele CRUD', () => {
  test('GET /goals – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/goals')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /goals/summary', async () => {
    const res = await authedGet(app, readerCookie, '/goals/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
  })

  test('POST /goals – editor erstellt Ziel mit KPIs', async () => {
    const res = await authedPost(app, editorCookie, '/goals', {
      title:    'Verfügbarkeit 99,9 %',
      category: 'availability',
      priority: 'high',
      status:   'active',
      dueDate:  '2026-12-31',
      owner:    'IT-Betrieb',
      description: 'Sicherstellen der Systemverfügbarkeit',
      kpis: [
        { name: 'Uptime', targetValue: 99.9, currentValue: 99.5, unit: '%' },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.progressCalc).toBeDefined()
    goalId = res.body.id
  })

  test('GET /goals/:id', async () => {
    const res = await authedGet(app, readerCookie, `/goals/${goalId}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Verfügbarkeit 99,9 %')
    expect(res.body.kpis).toHaveLength(1)
  })

  test('PUT /goals/:id – aktualisieren', async () => {
    const res = await authedPut(app, editorCookie, `/goals/${goalId}`, {
      kpis: [
        { name: 'Uptime', targetValue: 99.9, currentValue: 99.9, unit: '%' },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.body.progressCalc).toBe(100)
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/goals', { title: 'X' })
    expect(res.status).toBe(403)
  })

  test('editor darf NICHT löschen (403)', async () => {
    const res = await authedDelete(app, editorCookie, `/goals/${goalId}`)
    expect(res.status).toBe(403)
  })

  test('DELETE /goals/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/goals/${goalId}`)
    expect(res.status).toBe(200)
    goalId = null
  })
})
