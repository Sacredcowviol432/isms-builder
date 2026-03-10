'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let biaId, planId, exerciseId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-bcm'
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

describe('BCM – Business Continuity Management', () => {

  // ── Summary ──────────────────────────────────────────────────────────────

  test('GET /bcm/summary → 200 mit korrekter Struktur', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('bia')
    expect(res.body).toHaveProperty('plans')
    expect(res.body).toHaveProperty('exercises')
    expect(res.body.bia).toHaveProperty('total')
    expect(res.body.bia).toHaveProperty('critical')
    expect(res.body.bia).toHaveProperty('withoutPlan')
    expect(res.body.plans).toHaveProperty('overdueTest')
    expect(res.body.exercises).toHaveProperty('upcoming')
    expect(res.body.exercises).toHaveProperty('lastResult')
  })

  test('GET /bcm/summary → 401 ohne Auth', async () => {
    const request = require('supertest')
    const res = await request(app).get('/bcm/summary')
    expect([401, 403]).toContain(res.status)
  })

  // ── BIA CRUD ─────────────────────────────────────────────────────────────

  test('GET /bcm/bia → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/bia')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(0)
  })

  test('reader darf BIA NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/bcm/bia', {
      title: 'Test BIA', criticality: 'high',
    })
    expect(res.status).toBe(403)
  })

  test('unauthentifizierter Zugriff auf /bcm/bia gesperrt (401)', async () => {
    const request = require('supertest')
    const res = await request(app).get('/bcm/bia')
    expect([401, 403]).toContain(res.status)
  })

  test('POST /bcm/bia – editor erstellt BIA (201)', async () => {
    const res = await authedPost(app, editorCookie, '/bcm/bia', {
      title:           'ERP-System Kernprozess',
      processOwner:    'Max Muster (CIO)',
      department:      'IT',
      criticality:     'critical',
      rto:             4,
      rpo:             1,
      mtpd:            8,
      dependencies:    ['Netzwerk', 'Strom'],
      affectedSystems: ['SAP', 'Oracle DB'],
      status:          'draft',
      notes:           'Kritischster Prozess',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^bia_/)
    expect(res.body.title).toBe('ERP-System Kernprozess')
    expect(res.body.criticality).toBe('critical')
    expect(res.body.rto).toBe(4)
    expect(res.body.rpo).toBe(1)
    expect(Array.isArray(res.body.dependencies)).toBe(true)
    biaId = res.body.id
  })

  test('GET /bcm/bia → enthält erstellte BIA', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/bia')
    expect(res.status).toBe(200)
    expect(res.body.some(b => b.id === biaId)).toBe(true)
  })

  test('GET /bcm/bia/:id → 200', async () => {
    const res = await authedGet(app, readerCookie, `/bcm/bia/${biaId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(biaId)
    expect(res.body.processOwner).toBe('Max Muster (CIO)')
  })

  test('GET /bcm/bia/:id → 404 bei unbekannter ID', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/bia/bia_000000xx')
    expect(res.status).toBe(404)
  })

  test('PUT /bcm/bia/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/bcm/bia/${biaId}`, {
      status: 'reviewed',
      rto:    6,
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('reviewed')
    expect(res.body.rto).toBe(6)
  })

  test('editor darf BIA NICHT löschen (403)', async () => {
    const res = await authedDelete(app, editorCookie, `/bcm/bia/${biaId}`)
    expect(res.status).toBe(403)
  })

  test('DELETE /bcm/bia/:id – admin löscht (soft-delete)', async () => {
    const res = await authedDelete(app, adminCookie, `/bcm/bia/${biaId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /bcm/bia/:id → 404 nach soft-delete', async () => {
    const res = await authedGet(app, readerCookie, `/bcm/bia/${biaId}`)
    expect(res.status).toBe(404)
  })

  test('gelöschte BIA erscheint NICHT in GET /bcm/bia', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/bia')
    expect(res.status).toBe(200)
    expect(res.body.some(b => b.id === biaId)).toBe(false)
  })

  // ── Plans CRUD ───────────────────────────────────────────────────────────

  test('GET /bcm/plans → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/plans')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /bcm/plans – editor erstellt Plan (201)', async () => {
    const res = await authedPost(app, editorCookie, '/bcm/plans', {
      title:        'IT-Wiederanlaufplan Test',
      type:         'itp',
      scope:        'SAP Produktivsystem',
      planOwner:    'Thomas Klein',
      status:       'draft',
      version:      '1.0',
      lastTested:   '',
      nextTest:     '2026-06-01',
      testResult:   'not_tested',
      linkedBiaIds: [],
      procedures:   '1. Failover aktivieren\n2. Test',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^bcp_/)
    expect(res.body.title).toBe('IT-Wiederanlaufplan Test')
    expect(res.body.type).toBe('itp')
    planId = res.body.id
  })

  test('GET /bcm/plans/:id → 200', async () => {
    const res = await authedGet(app, readerCookie, `/bcm/plans/${planId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(planId)
    expect(res.body.planOwner).toBe('Thomas Klein')
  })

  test('PUT /bcm/plans/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/bcm/plans/${planId}`, {
      status:     'approved',
      testResult: 'pass',
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('approved')
    expect(res.body.testResult).toBe('pass')
  })

  test('DELETE /bcm/plans/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/bcm/plans/${planId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /bcm/plans/:id → 404 nach soft-delete', async () => {
    const res = await authedGet(app, readerCookie, `/bcm/plans/${planId}`)
    expect(res.status).toBe(404)
  })

  // ── Exercises CRUD ───────────────────────────────────────────────────────

  test('GET /bcm/exercises → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/exercises')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /bcm/exercises – editor erstellt Übung (201)', async () => {
    const res = await authedPost(app, editorCookie, '/bcm/exercises', {
      title:        'Tabletop-Übung Ransomware',
      type:         'tabletop',
      date:         '2026-05-10',
      conductor:    'Claudia Meier (CISO)',
      participants: ['CISO', 'CIO', 'Rechtsabteilung'],
      linkedPlanId: '',
      result:       'planned',
      findings:     '',
      actions:      '',
      nextExercise: '',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^bex_/)
    expect(res.body.title).toBe('Tabletop-Übung Ransomware')
    expect(res.body.result).toBe('planned')
    exerciseId = res.body.id
  })

  test('GET /bcm/exercises/:id → 200', async () => {
    const res = await authedGet(app, readerCookie, `/bcm/exercises/${exerciseId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(exerciseId)
    expect(res.body.conductor).toBe('Claudia Meier (CISO)')
  })

  test('PUT /bcm/exercises/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/bcm/exercises/${exerciseId}`, {
      result:   'pass',
      findings: 'Alle Ziele erreicht.',
    })
    expect(res.status).toBe(200)
    expect(res.body.result).toBe('pass')
    expect(res.body.findings).toBe('Alle Ziele erreicht.')
  })

  test('DELETE /bcm/exercises/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/bcm/exercises/${exerciseId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('DELETE /bcm/exercises/:id → 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/bcm/exercises/bex_000000xx')
    expect(res.status).toBe(404)
  })

  test('DELETE /bcm/plans/:id → 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/bcm/plans/bcp_000000xx')
    expect(res.status).toBe(404)
  })

  test('DELETE /bcm/bia/:id → 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/bcm/bia/bia_000000xx')
    expect(res.status).toBe(404)
  })

  // ── Summary nach Testdaten ────────────────────────────────────────────────

  test('GET /bcm/summary nach CRUD → Zähler korrekt', async () => {
    const res = await authedGet(app, readerCookie, '/bcm/summary')
    expect(res.status).toBe(200)
    // Nach soft-delete sind alle wieder 0
    expect(res.body.bia.total).toBe(0)
    expect(res.body.plans.total).toBe(0)
    expect(res.body.exercises.total).toBe(0)
  })
})
