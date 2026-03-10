'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, coCookie, editorCookie, readerCookie, auditorCookie
let vvtId, avId, dsfaId, incidentId, dsarId, tomId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-gdpr'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie   = await loginAs(app, 'admin')
  coCookie      = await loginAs(app, 'contentowner')
  editorCookie  = await loginAs(app, 'editor')
  readerCookie  = await loginAs(app, 'reader')
  auditorCookie = await loginAs(app, 'auditor')
})

afterAll(async () => {
  for (const [route, id] of [
    ['vvt', vvtId], ['av', avId], ['dsfa', dsfaId],
    ['incidents', incidentId], ['dsar', dsarId], ['toms', tomId],
  ]) {
    if (id) await authedDelete(app, adminCookie, `/gdpr/${route}/${id}`)
  }
  removeTestDataDir(dataDir)
})

describe('GDPR – VVT (Verarbeitungsverzeichnis)', () => {
  test('GET /gdpr/vvt – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/gdpr/vvt')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /gdpr/vvt – editor erstellt Eintrag', async () => {
    const res = await authedPost(app, editorCookie, '/gdpr/vvt', {
      name:      'Kundenverwaltung',
      purpose:   'Vertragserfüllung',
      legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO',
      categories: ['Stammdaten'],
      recipients: ['intern'],
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    vvtId = res.body.id
  })

  test('PUT /gdpr/vvt/:id – aktualisieren', async () => {
    const res = await authedPut(app, editorCookie, `/gdpr/vvt/${vvtId}`, { purpose: 'Vertragserfüllung (aktualisiert)' })
    expect(res.status).toBe(200)
    expect(res.body.purpose).toBe('Vertragserfüllung (aktualisiert)')
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/gdpr/vvt', { name: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('GDPR – AV-Verträge', () => {
  test('POST /gdpr/av – contentowner erstellt AV', async () => {
    const res = await authedPost(app, coCookie, '/gdpr/av', {
      processor: 'Cloud-Anbieter GmbH',
      services:  'E-Mail-Hosting',
      signedDate: '2025-01-01',
    })
    expect(res.status).toBe(201)
    avId = res.body.id
  })

  test('editor darf NICHT AV erstellen (403)', async () => {
    const res = await authedPost(app, editorCookie, '/gdpr/av', { processor: 'Test' })
    expect(res.status).toBe(403)
  })
})

describe('GDPR – DSFA', () => {
  test('POST /gdpr/dsfa – contentowner erstellt DSFA', async () => {
    const res = await authedPost(app, coCookie, '/gdpr/dsfa', {
      title:       'DSFA Mitarbeiterüberwachung',
      description: 'Prüfung der Notwendigkeit einer DSFA',
      likelihood:  2,
      impact:      3,
    })
    expect(res.status).toBe(201)
    dsfaId = res.body.id
  })
})

describe('GDPR – Datenpannen', () => {
  test('POST /gdpr/incidents – auditor meldet Vorfall', async () => {
    const res = await authedPost(app, auditorCookie, '/gdpr/incidents', {
      title:       'USB-Stick verloren',
      description: 'Mitarbeiter hat unverschlüsselten USB-Stick verloren',
      severity:    'medium',
      detectedAt:  new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    incidentId = res.body.id
  })

  test('contentowner kann ebenfalls Vorfall melden', async () => {
    const res = await authedPost(app, coCookie, '/gdpr/incidents', {
      title:    'Phishing-Mail',
      severity: 'low',
    })
    expect(res.status).toBe(201)
    await authedDelete(app, adminCookie, `/gdpr/incidents/${res.body.id}`)
  })

  test('reader darf NICHT melden (403)', async () => {
    const res = await authedPost(app, readerCookie, '/gdpr/incidents', { title: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('GDPR – DSAR (Betroffenenrechte)', () => {
  test('POST /gdpr/dsar – editor erstellt Anfrage', async () => {
    const res = await authedPost(app, editorCookie, '/gdpr/dsar', {
      subject:    'Max Mustermann',
      type:       'access',
      receivedAt: new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    dsarId = res.body.id
  })

  test('reader darf NICHT auf DSAR zugreifen (403)', async () => {
    const res = await authedGet(app, readerCookie, '/gdpr/dsar')
    expect(res.status).toBe(403)
  })
})

describe('GDPR – TOMs', () => {
  test('POST /gdpr/toms – contentowner erstellt TOM', async () => {
    const res = await authedPost(app, coCookie, '/gdpr/toms', {
      title:    'Festplattenverschlüsselung',
      category: 'technical',
      status:   'implemented',
    })
    expect(res.status).toBe(201)
    tomId = res.body.id
  })
})

describe('GDPR – Dashboard', () => {
  test('GET /gdpr/dashboard gibt Übersicht', async () => {
    const res = await authedGet(app, readerCookie, '/gdpr/dashboard')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('vvt')
    expect(res.body).toHaveProperty('incidents')
  })
})
