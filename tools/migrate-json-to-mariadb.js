#!/usr/bin/env node
'use strict'
/**
 * Migration: JSON file stores → MariaDB/MySQL
 *
 * Prerequisites:
 *   1. Install mysql2:  npm install mysql2
 *   2. Create database: CREATE DATABASE isms_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 *   3. Create user:     CREATE USER 'isms'@'localhost' IDENTIFIED BY 'yourpass';
 *                       GRANT ALL PRIVILEGES ON isms_builder.* TO 'isms'@'localhost';
 *
 * Configure connection via .env or environment variables:
 *   DB_HOST=localhost  DB_PORT=3306  DB_USER=isms  DB_PASS=yourpass  DB_NAME=isms_builder
 *
 * Run once before switching STORAGE_BACKEND=mariadb:
 *   node tools/migrate-json-to-mariadb.js
 *
 * Idempotent: rows with existing IDs are skipped (INSERT IGNORE).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const path = require('path')
const fs   = require('fs')

let mysql2
try {
  mysql2 = require('mysql2/promise')
} catch {
  console.error('ERROR: mysql2 package not found. Run: npm install mysql2')
  process.exit(1)
}

const DATA    = path.join(__dirname, '../data')
const gdprDir = path.join(DATA, 'gdpr')

function readJson(file, fallback = []) {
  const p = path.join(DATA, file)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function readGdpr(file) {
  const p = path.join(gdprDir, file)
  if (!fs.existsSync(p)) return []
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return [] }
}

function arr(v)  { return JSON.stringify(Array.isArray(v) ? v : []) }
function str(v)  { return v != null ? String(v) : '' }
function bit(v)  { return v ? 1 : 0 }
function now()   { return new Date().toISOString() }

let migrated = 0
let skipped  = 0

async function run(conn, label, sql, rows) {
  console.log(`\n── ${label} (${rows.length} records) ──`)
  for (const params of rows) {
    try {
      const [result] = await conn.execute(sql, params)
      if (result.affectedRows > 0) { migrated++; process.stdout.write('.') }
      else                          { skipped++;  process.stdout.write('s') }
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') { skipped++; process.stdout.write('s') }
      else console.error(`\n  ERROR: ${e.message}`)
    }
  }
  console.log()
}

async function main() {
  const pool = mysql2.createPool({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER || 'isms',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'isms_builder',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    charset:  'utf8mb4',
    multipleStatements: false,
  })

  console.log(`Connecting to MariaDB/MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'isms_builder'} …`)

  const conn = await pool.getConnection()
  console.log('Connected.')

  // Ensure schema exists
  const { init: initDb } = require('../server/db/mariadbDatabase')
  await initDb()
  console.log('Schema ready.')

  try {
    // ── Templates ────────────────────────────────────────────────────────────
    const templates = readJson('templates.json', [])
    await run(conn, 'Templates', `
      INSERT IGNORE INTO templates
        (id, type, language, title, content, version, status, owner, next_review_date,
         parent_id, sort_order, created_at, updated_at,
         linked_controls, applicable_entities, attachments, history, status_history)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, templates.map(t => [
      t.id, t.type, t.language || 'de', str(t.title), str(t.content),
      t.version || 1, t.status || 'draft', t.owner || null,
      t.nextReviewDate || t.reviewDate || null,
      t.parentId || null, t.sortOrder || 0,
      t.createdAt || now(), t.updatedAt || now(),
      arr(t.linkedControls), arr(t.applicableEntities), arr(t.attachments),
      arr(t.history), arr(t.statusHistory),
    ]))

    // ── Training ─────────────────────────────────────────────────────────────
    const training = readJson('training.json', [])
    await run(conn, 'Training', `
      INSERT IGNORE INTO training
        (id, title, description, category, status, due_date, completed_date,
         instructor, assignees, applicable_entities, evidence, mandatory,
         created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, training.map(t => [
      t.id, str(t.title), str(t.description), str(t.category), str(t.status),
      t.dueDate || null, t.completedDate || null,
      str(t.instructor), str(t.assignees), arr(t.applicableEntities),
      str(t.evidence), bit(t.mandatory),
      str(t.createdBy), t.createdAt || now(), t.updatedAt || now(),
    ]))

    // ── Entities ─────────────────────────────────────────────────────────────
    const entities = readJson('entities.json', [])
    await run(conn, 'Entities', `
      INSERT IGNORE INTO entities (id, name, short, type, parent_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?)
    `, entities.map(e => [
      e.id, str(e.name), str(e.short || e.shortName || ''),
      str(e.type), e.parentId || null,
      e.createdAt || now(), e.updatedAt || now(),
    ]))

    // ── Risks ─────────────────────────────────────────────────────────────────
    const risks = readJson('risks.json', [])
    await run(conn, 'Risks', `
      INSERT IGNORE INTO risks
        (id, title, description, category, likelihood, impact, risk_score, status,
         owner, applicable_entities, treatments, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, risks.map(r => [
      r.id, str(r.title), str(r.description), str(r.category),
      r.likelihood || 2, r.impact || 2,
      r.riskScore || r.score || (r.likelihood||2) * (r.impact||2),
      str(r.status), str(r.owner), arr(r.applicableEntities),
      arr(r.treatments), str(r.createdBy),
      r.createdAt || now(), r.updatedAt || now(),
    ]))

    // ── Guidance ──────────────────────────────────────────────────────────────
    const guidance = readJson('guidance.json', [])
    await run(conn, 'Guidance', `
      INSERT IGNORE INTO guidance
        (id, title, category, content, file_name, file_type, file_size, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `, guidance.map(g => [
      g.id, str(g.title), str(g.category), str(g.content),
      g.fileName || null, g.fileType || null, g.fileSize || null,
      str(g.createdBy), g.createdAt || now(), g.updatedAt || now(),
    ]))

    // ── Goals ─────────────────────────────────────────────────────────────────
    const goals = readJson('goals.json', [])
    await run(conn, 'Goals', `
      INSERT IGNORE INTO goals
        (id, title, description, category, status, priority, target_value,
         current_value, unit, due_date, review_date, owner,
         applicable_entities, linked_controls, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, goals.map(g => [
      g.id, str(g.title), str(g.description), str(g.category),
      str(g.status), str(g.priority),
      g.targetValue ?? null, g.currentValue ?? null, g.unit || null,
      g.dueDate || null, g.reviewDate || null, str(g.owner),
      arr(g.applicableEntities), arr(g.linkedControls),
      str(g.createdBy), g.createdAt || now(), g.updatedAt || now(),
    ]))

    // ── Assets ────────────────────────────────────────────────────────────────
    const assets = readJson('assets.json', [])
    await run(conn, 'Assets', `
      INSERT IGNORE INTO assets
        (id, name, description, category, classification, criticality, owner,
         location, eol_date, status, applicable_entities, linked_controls,
         created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, assets.map(a => [
      a.id, str(a.name), str(a.description), str(a.category),
      str(a.classification), str(a.criticality), str(a.owner),
      str(a.location), a.eolDate || null, str(a.status),
      arr(a.applicableEntities), arr(a.linkedControls),
      str(a.createdBy), a.createdAt || now(), a.updatedAt || now(),
    ]))

    // ── Suppliers ─────────────────────────────────────────────────────────────
    const suppliers = readJson('suppliers.json', [])
    await run(conn, 'Suppliers', `
      INSERT IGNORE INTO suppliers
        (id, name, category, contact, risk_level, status, contract_end, next_audit,
         notes, applicable_entities, linked_controls, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, suppliers.map(s => [
      s.id, str(s.name), str(s.category), str(s.contact),
      str(s.riskLevel), str(s.status),
      s.contractEnd || null, s.nextAudit || null,
      str(s.notes), arr(s.applicableEntities), arr(s.linkedControls),
      str(s.createdBy), s.createdAt || now(), s.updatedAt || now(),
    ]))

    // ── GDPR sub-stores ───────────────────────────────────────────────────────
    const vvt = readGdpr('vvt.json')
    await run(conn, 'GDPR VVT', `
      INSERT IGNORE INTO gdpr_vvt
        (id, name, purpose, legal_basis, legal_basis_note, data_categories,
         data_subjects, recipients, retention, applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, vvt.map(v => [
      v.id, str(v.name), str(v.purpose), str(v.legalBasis), str(v.legalBasisNote),
      arr(v.dataCategories), arr(v.dataSubjects), str(v.recipients), str(v.retention),
      arr(v.applicableEntities), str(v.createdBy), v.createdAt||now(), v.updatedAt||now(),
    ]))

    const av = readGdpr('av.json')
    await run(conn, 'GDPR AV', `
      INSERT IGNORE INTO gdpr_av
        (id, processor, service, contract_date, review_date, status, checklist,
         applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, av.map(a => [
      a.id, str(a.processor), str(a.service), a.contractDate||null, a.reviewDate||null,
      str(a.status), arr(a.checklist), arr(a.applicableEntities),
      str(a.createdBy), a.createdAt||now(), a.updatedAt||now(),
    ]))

    const gdprIncidents = readGdpr('incidents.json')
    await run(conn, 'GDPR Incidents', `
      INSERT IGNORE INTO gdpr_incidents
        (id, title, description, incident_type, discovered_at, reported_at,
         authority_notified, subjects_notified, status, measures,
         applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, gdprIncidents.map(i => [
      i.id, str(i.title), str(i.description), str(i.incidentType),
      i.discoveredAt||null, i.reportedAt||null,
      bit(i.authorityNotified), bit(i.subjectsNotified),
      str(i.status), str(i.measures), arr(i.applicableEntities),
      str(i.createdBy), i.createdAt||now(), i.updatedAt||now(),
    ]))

    const toms = readGdpr('toms.json')
    await run(conn, 'GDPR TOMs', `
      INSERT IGNORE INTO gdpr_toms
        (id, category, title, description, status, review_date,
         applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `, toms.map(t => [
      t.id, str(t.category), str(t.title), str(t.description),
      str(t.status), t.reviewDate||null, arr(t.applicableEntities),
      str(t.createdBy), t.createdAt||now(), t.updatedAt||now(),
    ]))

    const dsar = readGdpr('dsar.json')
    await run(conn, 'GDPR DSAR', `
      INSERT IGNORE INTO gdpr_dsar
        (id, requester, request_type, received_at, due_date, extended_due_date,
         status, notes, applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, dsar.map(d => [
      d.id, str(d.requester), str(d.requestType),
      d.receivedAt||null, d.dueDate||null, d.extendedDueDate||null,
      str(d.status), str(d.notes), arr(d.applicableEntities),
      str(d.createdBy), d.createdAt||now(), d.updatedAt||now(),
    ]))

    const dsfa = readGdpr('dsfa.json')
    await run(conn, 'GDPR DSFA', `
      INSERT IGNORE INTO gdpr_dsfa
        (id, title, description, likelihood, impact, risk_score, measures,
         status, applicable_entities, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, dsfa.map(d => [
      d.id, str(d.title), str(d.description),
      d.likelihood || 2, d.impact || 2,
      d.riskScore || d.risk_score || (d.likelihood||2)*(d.impact||2),
      str(d.measures), str(d.status), arr(d.applicableEntities),
      str(d.createdBy), d.createdAt||now(), d.updatedAt||now(),
    ]))

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`\n✓ Migration complete: ${migrated} rows inserted, ${skipped} rows skipped (already existed).`)
    console.log(`\n  Next steps:`)
    console.log(`    1. Set STORAGE_BACKEND=mariadb in your .env`)
    console.log(`    2. Restart the server: npm start`)

  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch(e => {
  console.error('Migration failed:', e.message)
  process.exit(1)
})
