// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'

const fs   = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'legal')

function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }

const FILES_DIR = path.join(DATA_DIR, 'files')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })
}

// Generische Attachment-Helfer (funktionieren für alle 3 Store-Dateien)
function addAttachment(fileName, id, meta) {
  const list = loadFile(fileName)
  const idx  = list.findIndex(x => x.id === id)
  if (idx === -1) return null
  if (!list[idx].attachments) list[idx].attachments = []
  list[idx].attachments.push(meta)
  list[idx].updatedAt = nowISO()
  saveFile(fileName, list)
  return list[idx]
}

function removeAttachment(fileName, id, attId) {
  const list = loadFile(fileName)
  const idx  = list.findIndex(x => x.id === id)
  if (idx === -1) return null
  const attIdx = (list[idx].attachments || []).findIndex(a => a.id === attId)
  if (attIdx === -1) return null
  const [att] = list[idx].attachments.splice(attIdx, 1)
  list[idx].updatedAt = nowISO()
  saveFile(fileName, list)
  return att
}

function loadFile(name) {
  ensureDir()
  const fp = path.join(DATA_DIR, name)
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')) } catch { return [] }
}

function saveFile(name, data) {
  ensureDir()
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2))
}

// ── Verträge / Contracts ────────────────────────────────────────────

const CONTRACT_TYPES    = ['service','supply','nda','framework','other']
const CONTRACT_STATUSES = ['draft','review','active','expired','terminated']

const contracts = {
  getAll({ status, type, entity } = {}) {
    let list = loadFile('contracts.json').filter(c => !c.deletedAt)
    if (status) list = list.filter(c => c.status === status)
    if (type)   list = list.filter(c => c.contractType === type)
    if (entity) list = list.filter(c => !c.applicableEntities?.length || c.applicableEntities.includes(entity))
    return list
  },
  getById(id) { return loadFile('contracts.json').find(c => c.id === id && !c.deletedAt) || null },
  create(fields, createdBy) {
    const list = loadFile('contracts.json')
    const item = {
      id:                 makeId('contract'),
      title:              fields.title          || 'Ohne Titel',
      contractType:       CONTRACT_TYPES.includes(fields.contractType) ? fields.contractType : 'other',
      counterparty:       fields.counterparty   || '',
      description:        fields.description    || '',
      startDate:          fields.startDate      || null,
      endDate:            fields.endDate        || null,
      autoRenew:          !!fields.autoRenew,
      noticePeriodDays:   parseInt(fields.noticePeriodDays) || null,
      owner:              fields.owner          || createdBy || '',
      status:             CONTRACT_STATUSES.includes(fields.status) ? fields.status : 'draft',
      value:              fields.value          || '',
      currency:           fields.currency       || 'EUR',
      linkedVvt:          Array.isArray(fields.linkedVvt)  ? fields.linkedVvt  : [],
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      notes:              fields.notes          || '',
      linkedControls:     Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:     Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      attachments:        [],
      createdAt:          nowISO(),
      updatedAt:          nowISO(),
      createdBy:          createdBy || 'system'
    }
    list.push(item)
    saveFile('contracts.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('contracts.json')
    const idx  = list.findIndex(c => c.id === id)
    if (idx === -1) return null
    const updatable = ['title','contractType','counterparty','description','startDate','endDate',
      'autoRenew','noticePeriodDays','owner','status','value','currency','linkedVvt','applicableEntities','notes',
      'linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) list[idx][k] = fields[k]
    }
    list[idx].updatedAt = nowISO()
    saveFile('contracts.json', list)
    return list[idx]
  },
  delete(id, deletedBy) {
    const list = loadFile('contracts.json')
    const idx  = list.findIndex(c => c.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('contracts.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('contracts.json')
    const idx  = list.findIndex(c => c.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('contracts.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('contracts.json')
    const idx  = list.findIndex(c => c.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('contracts.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('contracts.json').filter(c => c.deletedAt)
  },
  addAttachment:    (id, meta) => addAttachment('contracts.json', id, meta),
  removeAttachment: (id, attId) => removeAttachment('contracts.json', id, attId),
  // Verträge die in den nächsten daysAhead Tagen auslaufen oder Kündigungsfrist erreichen
  getExpiring(daysAhead = 60) {
    const list = loadFile('contracts.json').filter(c => !c.deletedAt)
    const now  = new Date()
    const cut  = new Date(now.getTime() + daysAhead * 86400000)
    return list.filter(c => {
      if (!['active','review'].includes(c.status)) return false
      if (!c.endDate) return false
      const end = new Date(c.endDate)
      const notice = c.noticePeriodDays || 0
      const noticeDate = new Date(end.getTime() - notice * 86400000)
      return noticeDate <= cut
    }).map(c => {
      const end = new Date(c.endDate)
      const notice = c.noticePeriodDays || 0
      return { ...c, noticeDate: new Date(end.getTime() - notice * 86400000).toISOString().slice(0,10) }
    })
  }
}

// ── NDAs ────────────────────────────────────────────────────────────

const NDA_TYPES     = ['bilateral','unilateral_recv','unilateral_give']
const NDA_STATUSES  = ['draft','signed','expired','terminated']

const ndas = {
  getAll({ status, entity } = {}) {
    let list = loadFile('ndas.json').filter(n => !n.deletedAt)
    if (status) list = list.filter(n => n.status === status)
    if (entity) list = list.filter(n => !n.applicableEntities?.length || n.applicableEntities.includes(entity))
    return list
  },
  getById(id) { return loadFile('ndas.json').find(n => n.id === id && !n.deletedAt) || null },
  create(fields, createdBy) {
    const list = loadFile('ndas.json')
    const item = {
      id:                 makeId('nda'),
      title:              fields.title       || 'NDA',
      ndaType:            NDA_TYPES.includes(fields.ndaType) ? fields.ndaType : 'bilateral',
      counterparty:       fields.counterparty || '',
      signingDate:        fields.signingDate  || null,
      expiryDate:         fields.expiryDate   || null,
      scope:              fields.scope        || '',
      owner:              fields.owner        || createdBy || '',
      status:             NDA_STATUSES.includes(fields.status) ? fields.status : 'draft',
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      notes:              fields.notes        || '',
      linkedControls:     Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:     Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      attachments:        [],
      createdAt:          nowISO(),
      updatedAt:          nowISO(),
      createdBy:          createdBy || 'system'
    }
    list.push(item)
    saveFile('ndas.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('ndas.json')
    const idx  = list.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updatable = ['title','ndaType','counterparty','signingDate','expiryDate','scope','owner','status','applicableEntities','notes','linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) list[idx][k] = fields[k]
    }
    list[idx].updatedAt = nowISO()
    saveFile('ndas.json', list)
    return list[idx]
  },
  delete(id, deletedBy) {
    const list = loadFile('ndas.json')
    const idx  = list.findIndex(n => n.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('ndas.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('ndas.json')
    const idx  = list.findIndex(n => n.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('ndas.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('ndas.json')
    const idx  = list.findIndex(n => n.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('ndas.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('ndas.json').filter(n => n.deletedAt)
  },
  addAttachment:    (id, meta) => addAttachment('ndas.json', id, meta),
  removeAttachment: (id, attId) => removeAttachment('ndas.json', id, attId)
}

// ── Privacy Policies ────────────────────────────────────────────────

const POLICY_TYPES    = ['privacy_notice','cookie','consent_form','employee','internal','other']
const POLICY_STATUSES = ['draft','review','published','archived']

const privacyPolicies = {
  getAll({ status, entity } = {}) {
    let list = loadFile('privacy-policies.json').filter(p => !p.deletedAt)
    if (status) list = list.filter(p => p.status === status)
    if (entity) list = list.filter(p => !p.applicableEntities?.length || p.applicableEntities.includes(entity))
    return list
  },
  getById(id) { return loadFile('privacy-policies.json').find(p => p.id === id && !p.deletedAt) || null },
  create(fields, createdBy) {
    const list = loadFile('privacy-policies.json')
    const item = {
      id:                 makeId('policy'),
      title:              fields.title         || 'Ohne Titel',
      policyType:         POLICY_TYPES.includes(fields.policyType) ? fields.policyType : 'other',
      description:        fields.description   || '',
      content:            fields.content       || '',
      publishedAt:        fields.publishedAt   || null,
      nextReviewDate:     fields.nextReviewDate || null,
      url:                fields.url           || '',
      owner:              fields.owner         || createdBy || '',
      status:             POLICY_STATUSES.includes(fields.status) ? fields.status : 'draft',
      version:            1,
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      notes:              fields.notes         || '',
      linkedControls:     Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:     Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      attachments:        [],
      createdAt:          nowISO(),
      updatedAt:          nowISO(),
      createdBy:          createdBy || 'system'
    }
    list.push(item)
    saveFile('privacy-policies.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('privacy-policies.json')
    const idx  = list.findIndex(p => p.id === id)
    if (idx === -1) return null
    const updatable = ['title','policyType','description','content','publishedAt','nextReviewDate',
      'url','owner','status','applicableEntities','notes','linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) list[idx][k] = fields[k]
    }
    if (fields.status && fields.status !== list[idx].status) list[idx].version++
    list[idx].updatedAt = nowISO()
    saveFile('privacy-policies.json', list)
    return list[idx]
  },
  delete(id, deletedBy) {
    const list = loadFile('privacy-policies.json')
    const idx  = list.findIndex(p => p.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('privacy-policies.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('privacy-policies.json')
    const idx  = list.findIndex(p => p.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('privacy-policies.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('privacy-policies.json')
    const idx  = list.findIndex(p => p.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('privacy-policies.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('privacy-policies.json').filter(p => p.deletedAt)
  },
  addAttachment:    (id, meta) => addAttachment('privacy-policies.json', id, meta),
  removeAttachment: (id, attId) => removeAttachment('privacy-policies.json', id, attId)
}

function getSummary() {
  const cList = loadFile('contracts.json').filter(c => !c.deletedAt)
  const nList = loadFile('ndas.json').filter(n => !n.deletedAt)
  const pList = loadFile('privacy-policies.json').filter(p => !p.deletedAt)
  return {
    contracts: {
      total:   cList.length,
      active:  cList.filter(c => c.status === 'active').length,
      expiring: contracts.getExpiring(60).length
    },
    ndas: {
      total:  nList.length,
      signed: nList.filter(n => n.status === 'signed').length
    },
    policies: {
      total:     pList.length,
      published: pList.filter(p => p.status === 'published').length,
      draft:     pList.filter(p => p.status === 'draft').length
    }
  }
}

module.exports = {
  contracts, ndas, privacyPolicies, getSummary,
  FILES_DIR,
  CONTRACT_TYPES, CONTRACT_STATUSES,
  NDA_TYPES, NDA_STATUSES,
  POLICY_TYPES, POLICY_STATUSES
}
