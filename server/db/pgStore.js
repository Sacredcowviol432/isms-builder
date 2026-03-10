// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// Minimal PostgreSQL storage adapter (skeleton).
// This is a foundation for migrating from JSON to PostgreSQL.
// Note: This is a scaffold; actual DB connection and table setup would be needed.
const { Pool } = require('pg')

const pool = new Pool({
  // Expecting env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT
  connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '',
})

async function ensureTables() {
  // Minimal table creation; in real deployment, use migrations
  const client = await pool.connect()
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS templates (
      id VARCHAR PRIMARY KEY,
      type VARCHAR,
      language VARCHAR,
      title VARCHAR,
      content TEXT,
      version INTEGER,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )`)
    await client.query(`CREATE TABLE IF NOT EXISTS template_history (
      id SERIAL PRIMARY KEY,
      template_id VARCHAR REFERENCES templates(id),
      version INTEGER,
      content TEXT,
      updated_at TIMESTAMP
    )`)
  } finally {
    client.release()
  }
}

module.exports = {
  init: async () => { await ensureTables() },
  getTemplates: async ({ type, language }) => {
    const client = await pool.connect()
    try {
      let q = 'SELECT * FROM templates'
      const vals = []
      const where = []
      if (type) { where.push('type = $' + (vals.length + 1)); vals.push(type) }
      if (language) { where.push('language = $' + (vals.length + 1)); vals.push(language) }
      if (where.length) q += ' WHERE ' + where.join(' AND ')
      const res = await client.query(q, vals)
      return res.rows
    } finally {
      client.release()
    }
  },
  getTemplate: async (type, id) => {
    const client = await pool.connect()
    try {
      const res = await client.query('SELECT * FROM templates WHERE type=$1 AND id=$2', [type, id])
      return res.rows[0]
    } finally { client.release() }
  },
  createTemplate: async ({ type, language, title, content }) => {
    const client = await pool.connect()
    try {
      const id = `${type}_${Date.now()}`
      const now = new Date()
      await client.query('INSERT INTO templates (id, type, language, title, content, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, type, language, title, content, 1, now, now])
      // history can be handled similarly
      return { id, type, language, title, content, version: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() }
    } finally { client.release() }
  },
  updateTemplate: async (type, id, { title, content }) => {
    const client = await pool.connect()
    try {
      const now = new Date()
      if (title) await client.query('UPDATE templates SET title=$1, updated_at=$2 WHERE id=$3 AND type=$4', [title, now, id, type])
      if (typeof content === 'string') await client.query('UPDATE templates SET content=$1, updated_at=$2 WHERE id=$3 AND type=$4', [content, now, id, type])
      // simplistic response
      return { id, type, title, content, version: 2, updatedAt: now.toISOString() }
    } finally { client.release() }
  },
  getHistory: async (type, id) => {
    // Minimal mock history; real implementation would query template_history
    return []
  }
}
