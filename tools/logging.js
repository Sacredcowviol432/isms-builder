#!/usr/bin/env node
"use strict";
// Simple JSON-line logger for ISMS backup events

const fs = require('fs')
const path = require('path')

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function getLogFile() {
  // Logs stored within the project backups area
  const logDir = path.join('.opencode', 'backups', 'logs')
  ensureDir(logDir)
  const logFile = path.join(logDir, 'backup.log.json')
  return logFile
}

function logEvent(event) {
  const logFile = getLogFile()
  const entry = Object.assign({ timestamp: new Date().toISOString() }, event)
  try {
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n", 'utf8')
  } catch (e) {
    // Fallback to stdout if logging fails
    console.error('Failed to write JSON log:', e)
  }
}

module.exports = { logEvent }
