'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let dataDir, app, request

beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR   = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-auth'
  process.env.NODE_ENV   = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app     = require('../server/index.js')
  request = require('supertest')
})

afterAll(() => removeTestDataDir(dataDir))

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /login', () => {
  test('login mit korrekten Zugangsdaten → 200 + Cookie', async () => {
    const res = await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('admin')
    expect(res.body.role).toBe('admin')
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
    expect(cookies[0]).toMatch(/sm_session=/)
  })

  test('login per E-Mail → 200', async () => {
    const res = await request(app).post('/login').send({ email: 'admin@test.local', password: 'adminpass' })
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('admin')
  })

  test('falsches Passwort → 401', async () => {
    const res = await request(app).post('/login').send({ username: 'admin', password: 'falsch' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })

  test('unbekannter Nutzer → 401', async () => {
    const res = await request(app).post('/login').send({ username: 'nobody', password: 'x' })
    expect(res.status).toBe(401)
  })

  test('fehlendes Passwort → 401', async () => {
    const res = await request(app).post('/login').send({ username: 'admin' })
    expect(res.status).toBe(401)
  })

  test('alle Testrollen können sich einloggen', async () => {
    const creds = [
      { username: 'editor',       password: 'editorpass'  },
      { username: 'reader',       password: 'readerpass'  },
      { username: 'auditor',      password: 'auditorpass' },
      { username: 'contentowner', password: 'copass'      },
    ]
    for (const c of creds) {
      const res = await request(app).post('/login').send(c)
      expect(res.status).toBe(200)
    }
  })
})

// ─── Geschützte Routen ohne Auth ──────────────────────────────────────────────

describe('Authentifizierungsschutz', () => {
  test('GET /templates ohne Cookie → 401', async () => {
    const res = await request(app).get('/templates')
    expect(res.status).toBe(401)
  })

  test('GET /risks ohne Cookie → 401', async () => {
    const res = await request(app).get('/risks')
    expect(res.status).toBe(401)
  })

  test('GET /dashboard ohne Cookie → 401', async () => {
    const res = await request(app).get('/dashboard')
    expect(res.status).toBe(401)
  })
})

// ─── Whoami ───────────────────────────────────────────────────────────────────

describe('GET /whoami', () => {
  let cookie

  beforeAll(async () => {
    const res = await request(app).post('/login').send({ username: 'editor', password: 'editorpass' })
    cookie = res.headers['set-cookie'][0].split(';')[0]
  })

  test('gibt eingeloggten Nutzer zurück inkl. has2FA', async () => {
    const res = await request(app).get('/whoami').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('editor')
    expect(res.body.role).toBe('editor')
    expect(res.body).toHaveProperty('has2FA')
  })

  test('ohne Cookie → 401', async () => {
    const res = await request(app).get('/whoami')
    expect(res.status).toBe(401)
  })
})

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('GET /logout', () => {
  test('löscht Cookie und gibt ok zurück', async () => {
    const loginRes = await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })
    const cookie = loginRes.headers['set-cookie'][0].split(';')[0]

    const res = await request(app).get('/logout').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
