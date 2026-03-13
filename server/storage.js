// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Storage façade: choose backend based on STORAGE_BACKEND env var
// Supported values: json (default), sqlite, mariadb / mysql, postgres / pg
const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

let store = null

if (backend === 'mariadb' || backend === 'mysql') {
  try {
    const mariadbStore = require('./db/mariadbStore')
    mariadbStore.init().then(() => {
      console.log('[storage] Backend: MariaDB/MySQL — schema ready')
    }).catch(e => {
      console.error('[storage] MariaDB schema init failed:', e.message)
    })
    store = mariadbStore
    console.log('[storage] Backend: MariaDB/MySQL')
  } catch (e) {
    console.warn('[storage] MariaDB backend failed to load. Falling back to JSON store.', e.message)
  }
}

if (!store && (backend === 'postgres' || backend === 'pg')) {
  try {
    const pgStore = require('./db/pgStore')
    store = pgStore
    console.log('[storage] Backend: PostgreSQL')
  } catch (e) {
    console.warn('[storage] Postgres backend failed to load. Falling back to JSON store.', e.message)
  }
}

if (!store && (backend === 'sqlite')) {
  try {
    const sqliteStore = require('./db/sqliteStore')
    sqliteStore.init()
    store = sqliteStore
    console.log('[storage] Backend: SQLite (data/isms.db)')
  } catch (e) {
    console.warn('[storage] SQLite backend failed to load. Falling back to JSON store.', e.message)
  }
}

if (!store) {
  store = require('./db/jsonStore')
  store.init()
  if (backend !== 'json') console.log('[storage] Backend: JSON (fallback)')
  else console.log('[storage] Backend: JSON')
}

module.exports = store
