#!/usr/bin/env node
'use strict'
/**
 * Migration: JSON file stores → SQLite (data/isms.db)
 *
 * Run once before switching STORAGE_BACKEND=sqlite:
 *   node tools/migrate-json-to-sqlite.js
 *
 * Idempotent: rows with existing IDs are skipped (INSERT OR IGNORE).
 */

const path    = require('path')
const fs      = require('fs')
const { getDb } = require('../server/db/database')

const DATA    = path.join(__dirname, '../data')
const db      = getDb()

function readJson(file, fallback = []) {
  const p = path.join(DATA, file)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function arr(v)  { return Array.isArray(v) ? JSON.stringify(v) : '[]' }
function str(v)  { return v || '' }
function int(v)  { return v ? 1 : 0 }
function now()   { return new Date().toISOString() }

let migrated = 0
let skipped  = 0

function run(label, stmt, rows) {
  console.log(`\n── ${label} ──`)
  for (const r of rows) {
    try {
      const info = stmt.run(...r)
      if (info.changes > 0) { migrated++; process.stdout.write('.') }
      else                  { skipped++;  process.stdout.write('s') }
    } catch (e) {
      console.error(`\n  ERROR: ${e.message}`, r[0])
    }
  }
  console.log()
}

// ── Templates ────────────────────────────────────────────────────────────────
const templates = readJson('templates.json', [])
run('Templates', db.prepare(`
  INSERT OR IGNORE INTO templates
    (id, type, language, title, content, version, status, owner, next_review_date,
     parent_id, sort_order, created_at, updated_at,
     linked_controls, applicable_entities, attachments, history, status_history)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`), templates.map(t => [
  t.id, t.type, t.language || 'de', str(t.title), str(t.content),
  t.version || 1, t.status || 'draft', t.owner || null,
  t.nextReviewDate || t.reviewDate || null,
  t.parentId || null, t.sortOrder || 0,
  t.createdAt || now(), t.updatedAt || now(),
  arr(t.linkedControls), arr(t.applicableEntities), arr(t.attachments),
  arr(t.history), arr(t.statusHistory)
]))

// ── Training ─────────────────────────────────────────────────────────────────
const training = readJson('training.json', [])
run('Training', db.prepare(`
  INSERT OR IGNORE INTO training
    (id, title, description, category, status, due_date, completed_date,
     instructor, assignees, applicable_entities, evidence, mandatory,
     created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`), training.map(t => [
  t.id, str(t.title), str(t.description), str(t.category), str(t.status),
  t.dueDate || null, t.completedDate || null,
  str(t.instructor), str(t.assignees), arr(t.applicableEntities),
  str(t.evidence), int(t.mandatory),
  str(t.createdBy), t.createdAt || now(), t.updatedAt || now()
]))

// ── Entities ─────────────────────────────────────────────────────────────────
const entities = readJson('entities.json', [])
run('Entities', db.prepare(`
  INSERT OR IGNORE INTO entities (id, name, short, type, parent_id, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?)
`), entities.map(e => [
  e.id, str(e.name), str(e.short || e.shortName || ''),
  str(e.type), e.parentId || null,
  e.createdAt || now(), e.updatedAt || now()
]))

// ── Risks ────────────────────────────────────────────────────────────────────
const risks = readJson('risks.json', [])
run('Risks', db.prepare(`
  INSERT OR IGNORE INTO risks
    (id, title, description, category, likelihood, impact, risk_score, status,
     owner, applicable_entities, treatments, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`), risks.map(r => [
  r.id, str(r.title), str(r.description), str(r.category),
  r.likelihood || 2, r.impact || 2, r.riskScore || (r.likelihood||2)*(r.impact||2),
  str(r.status), str(r.owner), arr(r.applicableEntities),
  arr(r.treatments), str(r.createdBy), r.createdAt || now(), r.updatedAt || now()
]))

// ── Guidance ─────────────────────────────────────────────────────────────────
const guidance = readJson('guidance.json', [])
run('Guidance', db.prepare(`
  INSERT OR IGNORE INTO guidance
    (id, title, category, content, file_name, file_type, file_size, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`), guidance.map(g => [
  g.id, str(g.title), str(g.category), str(g.content),
  g.fileName || null, g.fileType || null, g.fileSize || null,
  str(g.createdBy), g.createdAt || now(), g.updatedAt || now()
]))

// ── GDPR sub-stores ───────────────────────────────────────────────────────────
const gdprDir = path.join(DATA, 'gdpr')

const vvt = fs.existsSync(path.join(gdprDir,'vvt.json')) ? JSON.parse(fs.readFileSync(path.join(gdprDir,'vvt.json'),'utf8')) : []
run('GDPR VVT', db.prepare(`
  INSERT OR IGNORE INTO gdpr_vvt
    (id, name, purpose, legal_basis, legal_basis_note, data_categories,
     data_subjects, recipients, retention, applicable_entities, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
`), vvt.map(v => [
  v.id, str(v.name), str(v.purpose), str(v.legalBasis), str(v.legalBasisNote),
  arr(v.dataCategories), arr(v.dataSubjects), str(v.recipients), str(v.retention),
  arr(v.applicableEntities), str(v.createdBy), v.createdAt||now(), v.updatedAt||now()
]))

const av = fs.existsSync(path.join(gdprDir,'av.json')) ? JSON.parse(fs.readFileSync(path.join(gdprDir,'av.json'),'utf8')) : []
run('GDPR AV', db.prepare(`
  INSERT OR IGNORE INTO gdpr_av
    (id, processor, service, contract_date, review_date, status, checklist,
     applicable_entities, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
`), av.map(a => [
  a.id, str(a.processor), str(a.service), a.contractDate||null, a.reviewDate||null,
  str(a.status), arr(a.checklist), arr(a.applicableEntities),
  str(a.createdBy), a.createdAt||now(), a.updatedAt||now()
]))

const incidents = fs.existsSync(path.join(gdprDir,'incidents.json')) ? JSON.parse(fs.readFileSync(path.join(gdprDir,'incidents.json'),'utf8')) : []
run('GDPR Incidents', db.prepare(`
  INSERT OR IGNORE INTO gdpr_incidents
    (id, title, description, incident_type, discovered_at, reported_at,
     authority_notified, subjects_notified, status, measures,
     applicable_entities, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`), incidents.map(i => [
  i.id, str(i.title), str(i.description), str(i.incidentType),
  i.discoveredAt||null, i.reportedAt||null,
  int(i.authorityNotified), int(i.subjectsNotified),
  str(i.status), str(i.measures), arr(i.applicableEntities),
  str(i.createdBy), i.createdAt||now(), i.updatedAt||now()
]))

const toms = fs.existsSync(path.join(gdprDir,'toms.json')) ? JSON.parse(fs.readFileSync(path.join(gdprDir,'toms.json'),'utf8')) : []
run('GDPR TOMs', db.prepare(`
  INSERT OR IGNORE INTO gdpr_toms
    (id, category, title, description, status, review_date,
     applicable_entities, created_by, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`), toms.map(t => [
  t.id, str(t.category), str(t.title), str(t.description),
  str(t.status), t.reviewDate||null, arr(t.applicableEntities),
  str(t.createdBy), t.createdAt||now(), t.updatedAt||now()
]))

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n✓ Migration complete: ${migrated} rows inserted, ${skipped} rows skipped (already existed).`)
console.log(`  Database: ${path.join(DATA, 'isms.db')}`)
console.log(`\n  Next step: set STORAGE_BACKEND=sqlite in your .env and restart the server.`)
