// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'
const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'suppliers.json')

function makeId() {
  return `sup_${require('crypto').randomBytes(4).toString('hex')}`
}
function nowISO() { return new Date().toISOString() }

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] }
}
function save(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2))
}

function getAll({ status, criticality, type } = {}) {
  let list = load().filter(i => !i.deletedAt)
  if (status)      list = list.filter(i => i.status      === status)
  if (criticality) list = list.filter(i => i.criticality === criticality)
  if (type)        list = list.filter(i => i.type        === type)
  return list
}

function getById(id) {
  return load().find(i => i.id === id && !i.deletedAt) || null
}

function create(fields, { createdBy } = {}) {
  const list = load()
  const item = {
    id:                   makeId(),
    name:                 fields.name                 || '',
    type:                 fields.type                 || 'other',
    criticality:          fields.criticality          || 'medium',
    status:               fields.status               || 'active',
    country:              fields.country              || '',
    contactName:          fields.contactName          || '',
    contactEmail:         fields.contactEmail         || '',
    website:              fields.website              || '',
    description:          fields.description          || '',
    products:             fields.products             || '',
    dataAccess:           typeof fields.dataAccess === 'boolean' ? fields.dataAccess : !!fields.dataAccess,
    dataCategories:       Array.isArray(fields.dataCategories)       ? fields.dataCategories       : [],
    securityRequirements: Array.isArray(fields.securityRequirements) ? fields.securityRequirements : [],
    lastAuditDate:        fields.lastAuditDate        || '',
    nextAuditDate:        fields.nextAuditDate        || '',
    auditResult:          fields.auditResult          || 'not_scheduled',
    contractId:           fields.contractId           || '',
    avContractId:         fields.avContractId         || '',
    riskScore:            typeof fields.riskScore === 'number' ? fields.riskScore : (parseInt(fields.riskScore) || 0),
    notes:                fields.notes                || '',
    linkedControls:       Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies:       Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:            nowISO(),
    updatedAt:            nowISO(),
    createdBy:            createdBy || 'system',
    deletedAt:            null,
  }
  list.push(item)
  save(list)
  return item
}

function update(id, patch, { changedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return null
  const allowed = [
    'name','type','criticality','status','country','contactName','contactEmail',
    'website','description','products','dataAccess','dataCategories','securityRequirements',
    'lastAuditDate','nextAuditDate','auditResult','contractId','avContractId',
    'riskScore','notes','linkedControls','linkedPolicies',
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined) list[idx][k] = patch[k]
  }
  list[idx].updatedAt = nowISO()
  if (changedBy) list[idx].updatedBy = changedBy
  save(list)
  return list[idx]
}

function remove(id, { deletedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return false
  list[idx].deletedAt = nowISO()
  if (deletedBy) list[idx].deletedBy = deletedBy
  save(list)
  return true
}

function permanentDelete(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx < 0) return false
  list.splice(idx, 1)
  save(list)
  return true
}

function restore(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && i.deletedAt)
  if (idx < 0) return null
  list[idx].deletedAt  = null
  list[idx].deletedBy  = undefined
  list[idx].updatedAt  = nowISO()
  save(list)
  return list[idx]
}

function getDeleted() {
  return load().filter(i => !!i.deletedAt)
}

function getSummary() {
  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const list = load().filter(i => !i.deletedAt)
  const total          = list.length
  const critical       = list.filter(i => i.criticality === 'critical').length
  const withDataAccess = list.filter(i => i.dataAccess).length

  const byStatus = {
    active:       list.filter(i => i.status === 'active').length,
    under_review: list.filter(i => i.status === 'under_review').length,
    inactive:     list.filter(i => i.status === 'inactive').length,
    terminated:   list.filter(i => i.status === 'terminated').length,
  }

  const overdueAudits  = list.filter(i => i.nextAuditDate && i.nextAuditDate < today).length
  const upcomingAudits = list.filter(i => i.nextAuditDate && i.nextAuditDate >= today && i.nextAuditDate <= in30).length

  return { total, critical, byStatus, withDataAccess, upcomingAudits, overdueAudits }
}

function getUpcomingAudits(days = 30) {
  const today  = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  return load().filter(i =>
    !i.deletedAt &&
    i.nextAuditDate &&
    i.nextAuditDate >= today &&
    i.nextAuditDate <= cutoff
  )
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  permanentDelete,
  restore,
  getDeleted,
  getSummary,
  getUpcomingAudits,
}
