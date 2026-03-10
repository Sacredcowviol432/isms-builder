#!/usr/bin/env node
/*
  Safe file-backup utility with change-detection and versioning.
  - Computes change percentage against previous version for a given file
  - Creates compressed backups with version in filename
  - Stores memory in .opencode/backups/.file-memory.json per project
  - Uses a simple memory-driven versioning scheme (vX.YY)
  - Excludes certain paths from backup
*/
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const { logEvent } = require('./logging')

function readMemory(memoryPath) {
  if (!fs.existsSync(memoryPath)) return {}
  try { return JSON.parse(fs.readFileSync(memoryPath, 'utf8')) }
  catch { return {} }
}

function writeMemory(memoryPath, data) {
  const dir = path.dirname(memoryPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { project: null, file: null, force: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--project' && i + 1 < args.length) opts.project = args[++i]
    else if (a === '--path' && i + 1 < args.length) opts.file = args[++i]
    else if (a === '--force') opts.force = true
  }
  return opts
}

function ensureNotExcluded(fpath) {
  const lower = fpath.toLowerCase()
  const excludes = ['.git', 'node_modules', '__pycache__', '.log', 'dist', 'build']
  return !excludes.some(e => lower.includes(path.sep + e) || lower.startsWith(e + path.sep) || lower.endsWith(path.sep + e))
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function incrementVersion(prev, bump) {
  // prev like v1.10; bump is 0.01, 0.10, or 1.00
  const m = prev.match(/^v(\d+)\.(\d{2})$/)
  if (!m) {
    return 'v1.00'
  }
  let major = parseInt(m[1], 10)
  let minor = parseInt(m[2], 10)
  const delta = Math.round(bump * 100)
  minor += delta
  if (minor >= 100) {
    major += 1
    minor = minor % 100
  }
  return `v${major}.${String(minor).padStart(2, '0')}`
}

function main() {
  const { project, file, force } = parseArgs()
  if (!project || !file) {
    console.error('Usage: node tools/backup.js --project <name> --path <file-to-backup> [--force]')
    process.exit(2)
  }
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }

  // Safety exclusions
  if (!ensureNotExcluded(abs)) {
    console.error('File is excluded from backups by policy')
    process.exit(1)
  }

  // Read memory
  const MEMORY_FILE = path.join('.opencode', 'backups', '.file-memory.json')
  const ROOT = process.cwd()
  const memoryPath = path.isAbsolute(MEMORY_FILE) ? MEMORY_FILE : path.join(ROOT, MEMORY_FILE)
  const memory = readMemory(memoryPath)

  // Compute relative path and initial memory structure
  const relPath = path.relative(ROOT, abs)
  const projectMem = (memory[project] = memory[project] || {})
  const entry = projectMem[relPath]

  const stats = fs.statSync(abs)
  const currentSize = stats.size
  let previousSize = entry?.current_size
  let previousVersion = entry?.current_version
  let currentVersion = 'v1.00'
  let changePercent = 0

  if (!entry || previousSize == null) {
    // First backup
    changePercent = 100
    currentVersion = 'v1.00'
  } else {
    changePercent = Math.abs(currentSize - previousSize) / previousSize * 100
    let bump = 0.01
    if (changePercent < 1) bump = 0.01
    else if (changePercent < 10) bump = 0.10
    else bump = 1.00
    currentVersion = incrementVersion(previousVersion || 'v1.00', bump)
  }

  // Prepare backup destination
  const destDir = path.join('.opencode', 'backups', project, relPath)
  ensureDir(destDir)
  const filename = path.basename(abs)
  const tarName = `${filename}.v${currentVersion.substring(1)}.tar.gz`
  const tarPath = path.join(destDir, tarName)

  // Prepare temp dir and meta.json
  const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'isms-backup-'))
  try {
    // Copy file
    const tmpFilePath = path.join(TMP_DIR, filename)
    fs.copyFileSync(abs, tmpFilePath)

    // Meta data
    const meta = {
      original_path: relPath,
      version: currentVersion,
      timestamp: new Date().toISOString(),
      change_percent: changePercent,
      previous_size: previousSize != null ? previousSize : currentSize,
      current_size: currentSize
    }
    fs.writeFileSync(path.join(TMP_DIR, '.meta.json'), JSON.stringify(meta, null, 2))

    // Create tar.gz: both file and meta.json inside a top-level directory mirroring relPath
    // We'll tar the contents of TMP_DIR with the base folder as the top directory
    // Create tar
    // We need to preserve directory structure; use tar from/temp
    // Build tar by switching to TMP_DIR's parent to retain relPath as root
    const parentDir = path.dirname(TMP_DIR)
    const rootInTar = path.basename(TMP_DIR) // single dir containing file and meta
    // Move into TMP_DIR/.. to tar the directory rootInTar
    const tarRoot = path.join(parentDir, rootInTar)
    // Make sure the file is placed under the correct relative path in tar
    // We will create a tar of the directory {rootInTar}
    const tarSource = tarRoot
    // Current dest tar must be under destDir; ensure directory exists
    // Use tar to compress, preserving the top directory
    // If tar is not available, fail gracefully
    execSync(`tar -czf "${tarPath}" -C "${parentDir}" "${rootInTar}"`, { stdio: 'inherit' })
  } finally {
    // Cleanup temp directory
    try { fs.rmSync(TMP_DIR, { recursive: true, force: true }) } catch {}
  }

  // Update memory
  memory[project] = memory[project] || {}
  memory[project][relPath] = {
    previous_size: previousSize != null ? previousSize : currentSize,
    previous_version: previousVersion || currentVersion,
    current_version: currentVersion,
    current_size: currentSize,
    change_count: (entry?.change_count ?? 0) + 1
  }
  writeMemory(memoryPath, memory)

  // Log via JSON logger for automation
  const logPayload = {
    action: 'backup',
    project,
    path: relPath,
    from_version: previousVersion ?? 'v0.00',
    to_version: currentVersion,
    change_percent: changePercent,
    previous_size: previousSize != null ? previousSize : currentSize,
    current_size: currentSize,
    tar_path: tarPath
  }
  logEvent(logPayload)
  // Human-readable console output for quick feedback
  console.log(`[${new Date().toISOString()}] BACKUP ${relPath} ${previousVersion ?? 'v0.00'} -> ${currentVersion} (${changePercent.toFixed(2)}%)`)
}

if (require.main === module) {
  main()
}
