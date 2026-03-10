// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'assets.json')

const ASSET_TYPES = {
  hardware_server:      'Server',
  hardware_workstation: 'Workstation / PC',
  hardware_laptop:      'Laptop / Notebook',
  hardware_mobile:      'Mobilgerät',
  hardware_network:     'Netzwerk-Equipment',
  hardware_ics_ot:      'ICS/OT-Anlage',
  hardware_building:    'Gebäudetechnik (BAS/GLT)',
  hardware_other:       'Hardware (Sonstige)',
  software_app:         'Anwendungssoftware',
  software_os:          'Betriebssystem',
  software_cloud:       'Cloud-Dienst (IaaS/PaaS)',
  software_saas:        'SaaS-Anwendung',
  software_other:       'Software (Sonstige)',
  data_database:        'Datenbank',
  data_document:        'Dokumentensammlung',
  data_backup:          'Backup / Archiv',
  data_other:           'Daten (Sonstige)',
  service_internal:     'Interner Dienst',
  service_cloud:        'Cloud-Service (extern)',
  service_external:     'Externer Dienstleister',
  facility_office:      'Bürogebäude',
  facility_datacenter:  'Rechenzentrum / Serverraum',
  facility_production:  'Produktionsstätte / Werk',
  facility_other:       'Einrichtung (Sonstige)',
}

const CATEGORIES = {
  hardware: 'Hardware',
  software: 'Software',
  data:     'Daten / Informationen',
  service:  'Dienste',
  facility: 'Einrichtungen',
}

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] }
}
function save(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2))
}
function nowISO() { return new Date().toISOString() }
function makeId()  {
  const hex = require('crypto').randomBytes(4).toString('hex')
  return `asset_${hex}`
}

function getAll({ category, type, classification, criticality, status, entityId } = {}) {
  let list = load().filter(i => !i.deletedAt)
  if (category)       list = list.filter(i => i.category       === category)
  if (type)           list = list.filter(i => i.type           === type)
  if (classification) list = list.filter(i => i.classification === classification)
  if (criticality)    list = list.filter(i => i.criticality    === criticality)
  if (status)         list = list.filter(i => i.status         === status)
  if (entityId)       list = list.filter(i => i.entityId       === entityId)
  return list
}

function getById(id) {
  return load().find(i => i.id === id && !i.deletedAt) || null
}

function create(data, { createdBy } = {}) {
  const list = load()
  const asset = {
    id:             makeId(),
    name:           data.name           || '',
    category:       data.category       || 'hardware',
    type:           data.type           || '',
    description:    data.description    || '',
    owner:          data.owner          || '',
    ownerEmail:     data.ownerEmail     || '',
    custodian:      data.custodian      || '',
    entityId:       data.entityId       || '',
    location:       data.location       || '',
    classification: data.classification || 'internal',
    criticality:    data.criticality    || 'medium',
    status:         data.status         || 'active',
    vendor:         data.vendor         || '',
    version:        data.version        || '',
    serialNumber:   data.serialNumber   || '',
    purchaseDate:   data.purchaseDate   || '',
    endOfLifeDate:  data.endOfLifeDate  || '',
    tags:           Array.isArray(data.tags) ? data.tags : (data.tags ? String(data.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
    notes:          data.notes          || '',
    linkedControls: Array.isArray(data.linkedControls) ? data.linkedControls : [],
    linkedPolicies: Array.isArray(data.linkedPolicies) ? data.linkedPolicies : [],
    createdAt:      nowISO(),
    updatedAt:      nowISO(),
    createdBy:      createdBy           || 'system',
  }
  list.push(asset)
  save(list)
  return asset
}

function update(id, patch, { changedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return null
  const item = list[idx]
  const allowed = [
    'name','category','type','description','owner','ownerEmail','custodian','entityId',
    'location','classification','criticality','status','vendor','version','serialNumber',
    'purchaseDate','endOfLifeDate','tags','notes','linkedControls','linkedPolicies',
  ]
  for (const k of allowed) {
    if (patch[k] !== undefined) item[k] = patch[k]
  }
  if (patch.tags !== undefined && !Array.isArray(item.tags)) {
    item.tags = String(item.tags).split(',').map(t => t.trim()).filter(Boolean)
  }
  item.updatedAt = nowISO()
  if (changedBy) item.updatedBy = changedBy
  save(list)
  return item
}

function remove(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return false
  list[idx].deletedAt = nowISO()
  save(list)
  return true
}

function getSummary() {
  const list  = load().filter(i => !i.deletedAt)
  const now   = new Date()
  const in90  = new Date(now.getTime() + 90 * 86400000)

  const total           = list.length
  const active          = list.filter(i => i.status === 'active').length
  const decommissioned  = list.filter(i => i.status === 'decommissioned').length
  const planned         = list.filter(i => i.status === 'planned').length

  const byCategory       = { hardware: 0, software: 0, data: 0, service: 0, facility: 0 }
  const byClassification = { public: 0, internal: 0, confidential: 0, strictly_confidential: 0 }
  const byCriticality    = { low: 0, medium: 0, high: 0, critical: 0 }

  let unclassified         = 0
  let criticalUnclassified = 0
  let endOfLifeSoon        = 0

  for (const a of list) {
    if (byCategory[a.category]       !== undefined) byCategory[a.category]++
    if (byClassification[a.classification] !== undefined) byClassification[a.classification]++
    else unclassified++
    if (byCriticality[a.criticality] !== undefined) byCriticality[a.criticality]++

    if (!a.classification || a.classification === 'public') unclassified++

    if ((a.criticality === 'critical' || a.criticality === 'high') && (!a.classification || a.classification === 'public')) {
      criticalUnclassified++
    }

    if (a.endOfLifeDate) {
      const eol = new Date(a.endOfLifeDate)
      if (eol >= now && eol <= in90) endOfLifeSoon++
    }
  }

  return {
    total, active, decommissioned, planned,
    unclassified,
    byCategory, byClassification, byCriticality,
    criticalUnclassified, endOfLifeSoon,
  }
}

module.exports = { getAll, getById, create, update, remove, getSummary, ASSET_TYPES, CATEGORIES }
