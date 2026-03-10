'use strict'
/**
 * rbac.test.js – Prüft Rollendurchsetzung pro Endpunkt.
 * Jede Rolle versucht erlaubte und verbotene Operationen.
 */
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, cookies

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-rbac'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  cookies = {
    admin:        await loginAs(app, 'admin'),
    editor:       await loginAs(app, 'editor'),
    reader:       await loginAs(app, 'reader'),
    auditor:      await loginAs(app, 'auditor'),
    contentowner: await loginAs(app, 'contentowner'),
  }
})

afterAll(() => removeTestDataDir(dataDir))

// ─── Templates ────────────────────────────────────────────────────────────────

describe('Templates – Rollenschutz', () => {
  test('reader darf lesen (GET /templates → 200)', async () => {
    const res = await authedGet(app, cookies.reader, '/templates')
    expect(res.status).toBe(200)
  })

  test('reader darf NICHT erstellen (POST /template → 403)', async () => {
    const res = await authedPost(app, cookies.reader, '/template', { type: 'policy', title: 'Test' })
    expect(res.status).toBe(403)
  })

  test('editor darf NICHT erstellen (POST /template → 403)', async () => {
    const res = await authedPost(app, cookies.editor, '/template', { type: 'policy', title: 'Test' })
    expect(res.status).toBe(403)
  })

  test('contentowner darf erstellen (POST /template → 201)', async () => {
    const res = await authedPost(app, cookies.contentowner, '/template', { type: 'policy', language: 'de', title: 'RBAC-Test-Template', content: 'x' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    // Cleanup
    await authedDelete(app, cookies.admin, `/template/policy/${res.body.id}`)
  })

  test('reader darf NICHT löschen (DELETE /template → 403)', async () => {
    // Erst erstellen
    const create = await authedPost(app, cookies.contentowner, '/template', { type: 'policy', language: 'de', title: 'Del-Test', content: 'x' })
    const id = create.body.id
    const res = await authedDelete(app, cookies.reader, `/template/policy/${id}`)
    expect(res.status).toBe(403)
    // Cleanup
    await authedDelete(app, cookies.admin, `/template/policy/${id}`)
  })

  test('admin darf löschen (DELETE /template → 200)', async () => {
    const create = await authedPost(app, cookies.contentowner, '/template', { type: 'policy', language: 'de', title: 'Del-Admin-Test', content: 'x' })
    const id = create.body.id
    const res = await authedDelete(app, cookies.admin, `/template/policy/${id}`)
    expect(res.status).toBe(200)
  })
})

// ─── Risiken (nur auditor + admin) ───────────────────────────────────────────

describe('Risiken – nur auditor + admin', () => {
  test('reader kann Risiken LESEN (GET /risks → 200)', async () => {
    const res = await authedGet(app, cookies.reader, '/risks')
    expect(res.status).toBe(200)
  })

  test('editor darf KEINE Risiken anlegen (POST /risks → 403)', async () => {
    const res = await authedPost(app, cookies.editor, '/risks', { title: 'Test' })
    expect(res.status).toBe(403)
  })

  test('contentowner darf Risiken anlegen (POST /risks → 201, CISO-Recht)', async () => {
    const res = await authedPost(app, cookies.contentowner, '/risks', { title: 'CISO-Risiko', category: 'operational', likelihood: 2, impact: 2 })
    expect(res.status).toBe(201)
    // Cleanup
    if (res.body?.id) await authedDelete(app, cookies.admin, `/risks/${res.body.id}`)
  })

  test('auditor darf Risiken anlegen (POST /risks → 201)', async () => {
    const res = await authedPost(app, cookies.auditor, '/risks', { title: 'Auditor-Risiko', category: 'operational', likelihood: 2, impact: 2 })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    // Cleanup
    await authedDelete(app, cookies.admin, `/risks/${res.body.id}`)
  })
})

// ─── Guidance (nur contentowner + admin) ─────────────────────────────────────

describe('Guidance – nur contentowner + admin', () => {
  test('reader kann Guidance LESEN (GET /guidance → 200)', async () => {
    const res = await authedGet(app, cookies.reader, '/guidance')
    expect(res.status).toBe(200)
  })

  test('editor darf KEINE Guidance erstellen (POST /guidance → 403)', async () => {
    const res = await authedPost(app, cookies.editor, '/guidance', { title: 'Test', category: 'rollen', content: 'x' })
    expect(res.status).toBe(403)
  })

  test('auditor darf Guidance erstellen (Rang 3 = contentowner-Rang → 201)', async () => {
    // authorizeContentOwner prüft rank >= 3, auditor hat Rang 3 → erlaubt
    const res = await authedPost(app, cookies.auditor, '/guidance', { title: 'Auditor-Guidance-Test', category: 'rollen', content: 'x' })
    expect(res.status).toBe(201)
    if (res.body.id) await authedDelete(app, cookies.admin, `/guidance/${res.body.id}`)
  })

  test('contentowner darf Guidance erstellen (POST /guidance → 201)', async () => {
    const res = await authedPost(app, cookies.contentowner, '/guidance', { title: 'RBAC-Guidance', category: 'rollen', content: 'Test-Inhalt' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    // Cleanup
    await authedDelete(app, cookies.admin, `/guidance/${res.body.id}`)
  })
})

// ─── Sicherheitsziele (editor+ erstellen, admin löscht) ──────────────────────

describe('Sicherheitsziele – Rollenschutz', () => {
  test('reader kann Ziele LESEN', async () => {
    const res = await authedGet(app, cookies.reader, '/goals')
    expect(res.status).toBe(200)
  })

  test('reader darf KEINE Ziele anlegen (POST /goals → 403)', async () => {
    const res = await authedPost(app, cookies.reader, '/goals', { title: 'Test' })
    expect(res.status).toBe(403)
  })

  test('editor darf Ziele anlegen (POST /goals → 201)', async () => {
    const res = await authedPost(app, cookies.editor, '/goals', { title: 'Editor-Ziel', category: 'availability', priority: 'medium', status: 'planned' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    // Cleanup
    await authedDelete(app, cookies.admin, `/goals/${res.body.id}`)
  })
})

// ─── Admin-Panel (nur admin) ──────────────────────────────────────────────────

describe('Admin-Panel – nur admin', () => {
  test('reader kann NICHT auf /admin/users zugreifen (403)', async () => {
    const res = await authedGet(app, cookies.reader, '/admin/users')
    expect(res.status).toBe(403)
  })

  test('editor kann NICHT auf /admin/users zugreifen (403)', async () => {
    const res = await authedGet(app, cookies.editor, '/admin/users')
    expect(res.status).toBe(403)
  })

  test('admin kann /admin/users lesen (200)', async () => {
    const res = await authedGet(app, cookies.admin, '/admin/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ─── Einstellungen (contentowner+ lesen, admin schreibt) ─────────────────────

describe('Einstellungen – Rollenschutz', () => {
  test('reader darf NICHT auf /admin/role-settings zugreifen (403)', async () => {
    const res = await authedGet(app, cookies.reader, '/admin/role-settings')
    expect(res.status).toBe(403)
  })

  test('contentowner darf /admin/role-settings lesen (200)', async () => {
    const res = await authedGet(app, cookies.contentowner, '/admin/role-settings')
    expect(res.status).toBe(200)
  })

  test('auditor darf /admin/role-settings lesen (200, Rang 3 ≥ 3)', async () => {
    const res = await authedGet(app, cookies.auditor, '/admin/role-settings')
    expect(res.status).toBe(200)
  })
})
