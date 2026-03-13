'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let unitId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-orgunits'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(() => {
  removeTestDataDir(dataDir)
})

describe('IT Org Units – CRUD', () => {
  test('GET /org-units – returns seed data', async () => {
    const res = await authedGet(app, readerCookie, '/org-units')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(4)   // CIO + GroupIT + GroupApp + Local IT
    expect(res.body.find(u => u.name === 'CIO')).toBeTruthy()
    expect(res.body.find(u => u.name === 'GroupIT')).toBeTruthy()
    expect(res.body.find(u => u.name === 'GroupApp')).toBeTruthy()
    expect(res.body.find(u => u.name === 'Local IT')).toBeTruthy()
  })

  test('POST /org-units – admin can create', async () => {
    const res = await authedPost(app, adminCookie, '/org-units', {
      name: 'Test Unit',
      type: 'local',
      parentId: 'ou-groupit',
      head: 'Max Mustermann',
      email: 'max@example.com',
      description: 'Test unit for unit tests',
    })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test Unit')
    expect(res.body.type).toBe('local')
    expect(res.body.parentId).toBe('ou-groupit')
    unitId = res.body.id
  })

  test('GET /org-units/:id – fetch single unit', async () => {
    const res = await authedGet(app, readerCookie, `/org-units/${unitId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(unitId)
  })

  test('PUT /org-units/:id – admin can update', async () => {
    const res = await authedPut(app, adminCookie, `/org-units/${unitId}`, {
      head: 'Erika Musterfrau',
    })
    expect(res.status).toBe(200)
    expect(res.body.head).toBe('Erika Musterfrau')
  })

  test('DELETE /org-units/:id – admin can delete', async () => {
    const res = await authedDelete(app, adminCookie, `/org-units/${unitId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /org-units/:id – 404 after delete', async () => {
    const res = await authedGet(app, readerCookie, `/org-units/${unitId}`)
    expect(res.status).toBe(404)
  })
})

describe('IT Org Units – Access control', () => {
  test('POST /org-units – editor is forbidden (admin only)', async () => {
    const res = await authedPost(app, editorCookie, '/org-units', {
      name: 'Should fail',
      type: 'group',
    })
    expect(res.status).toBe(403)
  })

  test('GET /org-units – reader can read', async () => {
    const res = await authedGet(app, readerCookie, '/org-units')
    expect(res.status).toBe(200)
  })

  test('POST /org-units – name required', async () => {
    const res = await authedPost(app, adminCookie, '/org-units', { type: 'group' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })
})
