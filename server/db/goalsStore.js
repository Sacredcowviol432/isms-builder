// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'goals.json')

function nowISO() { return new Date().toISOString() }
function makeId() { return `goal_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
function makeKpiId() { return `kpi_${Date.now()}_${Math.random().toString(36).slice(2,4)}` }

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function save(list) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
}

const CATEGORIES = [
  { id: 'confidentiality', label: 'Vertraulichkeit' },
  { id: 'integrity',       label: 'Integrität' },
  { id: 'availability',    label: 'Verfügbarkeit' },
  { id: 'compliance',      label: 'Compliance' },
  { id: 'operational',     label: 'Betrieblich' },
  { id: 'technical',       label: 'Technisch' },
  { id: 'organizational',  label: 'Organisatorisch' }
]

const STATUSES = [
  { id: 'planned',   label: 'Geplant' },
  { id: 'active',    label: 'Aktiv' },
  { id: 'achieved',  label: 'Erreicht' },
  { id: 'missed',    label: 'Verfehlt' },
  { id: 'cancelled', label: 'Abgebrochen' }
]

const PRIORITIES = [
  { id: 'low',      label: 'Niedrig' },
  { id: 'medium',   label: 'Mittel' },
  { id: 'high',     label: 'Hoch' },
  { id: 'critical', label: 'Kritisch' }
]

// Fortschritt aus KPIs berechnen, falls vorhanden
function calcProgress(goal) {
  const kpis = (goal.kpis || []).filter(k => k.targetValue > 0)
  if (!kpis.length) return goal.progress || 0
  const avg = kpis.reduce((s, k) => {
    return s + Math.min(100, Math.round((k.currentValue / k.targetValue) * 100))
  }, 0) / kpis.length
  return Math.round(avg)
}

function publicGoal(g) {
  return { ...g, progressCalc: calcProgress(g) }
}

function getAll({ status, category, entity } = {}) {
  let list = load().filter(g => !g.deletedAt).map(publicGoal)
  if (status)   list = list.filter(g => g.status === status)
  if (category) list = list.filter(g => g.category === category)
  if (entity)   list = list.filter(g =>
    !g.applicableEntities?.length || g.applicableEntities.includes(entity))
  return list
}

function getById(id) {
  const g = load().find(g => g.id === id && !g.deletedAt)
  return g ? publicGoal(g) : null
}

function create(fields, createdBy) {
  const list = load()
  const item = {
    id:                 makeId(),
    title:              fields.title        || 'Ohne Titel',
    description:        fields.description  || '',
    category:           CATEGORIES.some(c => c.id === fields.category) ? fields.category : 'organizational',
    status:             STATUSES.some(s => s.id === fields.status)     ? fields.status   : 'planned',
    priority:           PRIORITIES.some(p => p.id === fields.priority) ? fields.priority : 'medium',
    owner:              fields.owner        || createdBy || '',
    targetDate:         fields.targetDate   || null,
    reviewDate:         fields.reviewDate   || null,
    progress:           parseInt(fields.progress) || 0,
    kpis:               Array.isArray(fields.kpis) ? fields.kpis.map(k => ({ ...k, id: k.id || makeKpiId() })) : [],
    linkedControls:     Array.isArray(fields.linkedControls)     ? fields.linkedControls     : [],
    linkedPolicies:     Array.isArray(fields.linkedPolicies)     ? fields.linkedPolicies     : [],
    applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
    notes:              fields.notes        || '',
    attachments:        [],
    createdAt:          nowISO(),
    updatedAt:          nowISO(),
    createdBy:          createdBy || 'system'
  }
  list.push(item)
  save(list)
  return publicGoal(item)
}

function update(id, fields) {
  const list = load()
  const idx  = list.findIndex(g => g.id === id)
  if (idx === -1) return null
  const updatable = ['title','description','category','status','priority','owner',
    'targetDate','reviewDate','progress','kpis','linkedControls','linkedPolicies','applicableEntities','notes']
  for (const k of updatable) {
    if (fields[k] !== undefined) list[idx][k] = fields[k]
  }
  if (fields.kpis) {
    list[idx].kpis = fields.kpis.map(k => ({ ...k, id: k.id || makeKpiId() }))
  }
  list[idx].updatedAt = nowISO()
  save(list)
  return publicGoal(list[idx])
}

function del(id, deletedBy) {
  const list = load()
  const idx  = list.findIndex(g => g.id === id)
  if (idx === -1) return false
  list[idx].deletedAt = new Date().toISOString()
  list[idx].deletedBy = deletedBy || null
  save(list)
  return true
}

function permanentDelete(id) {
  const list = load()
  const idx  = list.findIndex(g => g.id === id)
  if (idx === -1) return false
  list.splice(idx, 1)
  save(list)
  return true
}

function restore(id) {
  const list = load()
  const idx  = list.findIndex(g => g.id === id)
  if (idx === -1) return null
  list[idx].deletedAt = null
  list[idx].deletedBy = null
  save(list)
  return publicGoal(list[idx])
}

function getDeleted() {
  return load().filter(g => g.deletedAt).map(publicGoal)
}

function getSummary() {
  const list = load().filter(g => !g.deletedAt).map(publicGoal)
  const now  = new Date()
  return {
    total:       list.length,
    active:      list.filter(g => g.status === 'active').length,
    achieved:    list.filter(g => g.status === 'achieved').length,
    planned:     list.filter(g => g.status === 'planned').length,
    overdue:     list.filter(g =>
      g.targetDate && new Date(g.targetDate) < now &&
      !['achieved','cancelled'].includes(g.status)).length,
    avgProgress: list.length
      ? Math.round(list.reduce((s, g) => s + g.progressCalc, 0) / list.length)
      : 0
  }
}

// Kalender-Events: Zieldatum + Review-Datum
function getCalendarEvents() {
  const list = load().filter(g => !g.deletedAt).map(publicGoal)
  const events = []
  for (const g of list) {
    if (['cancelled','achieved'].includes(g.status)) continue
    if (g.targetDate) events.push({
      date:   g.targetDate,
      type:   'goal_due',
      label:  `Ziel fällig: ${g.title}`,
      goalId: g.id,
      title:  g.title
    })
    if (g.reviewDate) events.push({
      date:   g.reviewDate,
      type:   'goal_review',
      label:  `Ziel-Review: ${g.title}`,
      goalId: g.id,
      title:  g.title
    })
  }
  return events
}

module.exports = {
  getAll, getById, create, update, delete: del, permanentDelete, restore, getDeleted,
  getSummary, getCalendarEvents,
  CATEGORIES, STATUSES, PRIORITIES
}
