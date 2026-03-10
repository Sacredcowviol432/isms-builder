// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'guidance.json')
const FILES_DIR = path.join(_BASE, 'guidance/files')

function ensureDir() {
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })
}

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function save(docs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2))
}

function nowISO() { return new Date().toISOString() }

function makeId() {
  return 'guid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

const VALID_CATEGORIES = ['systemhandbuch', 'rollen', 'policy-prozesse', 'soa-audit', 'admin-intern']

const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }

function _roleRank(role) { return ROLE_RANK[(role || '').toLowerCase()] || 1 }

function _visibleFor(doc, userRank) {
  if (!doc.minRole) return true
  return userRank >= (_roleRank(doc.minRole))
}

function getAll(userRank) {
  const rank = userRank != null ? userRank : 1
  return load().filter(d => !d.deletedAt && _visibleFor(d, rank)).map(d => publicDoc(d))
}

function getByCategory(cat, userRank) {
  const rank = userRank != null ? userRank : 1
  return load()
    .filter(d => d.category === cat && !d.deletedAt && _visibleFor(d, rank))
    .sort((a, b) => {
      const ap = a.pinOrder != null ? a.pinOrder : Infinity
      const bp = b.pinOrder != null ? b.pinOrder : Infinity
      if (ap !== bp) return ap - bp
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
    .map(d => publicDoc(d))
}

function getById(id) {
  const doc = load().find(d => d.id === id && !d.deletedAt)
  return doc ? doc : null   // return full doc including filePath
}

function create({ category, title, type, content, filename, filePath, createdBy, minRole, linkedControls }) {
  if (!VALID_CATEGORIES.includes(category)) throw new Error('Invalid category')
  const docs = load()
  const doc = {
    id: makeId(),
    category,
    title: title || 'Ohne Titel',
    type: type || 'markdown',
    content: content || '',
    filename: filename || null,
    filePath: filePath || null,
    linkedControls: Array.isArray(linkedControls) ? linkedControls : [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    createdBy: createdBy || 'system',
    version: 1,
    minRole: minRole || null
  }
  docs.push(doc)
  save(docs)
  return publicDoc(doc)
}

function update(id, fields) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  const doc = docs[idx]
  if (fields.title          !== undefined) doc.title    = fields.title
  if (fields.category       !== undefined && VALID_CATEGORIES.includes(fields.category)) doc.category = fields.category
  if (fields.content        !== undefined) doc.content  = fields.content
  if (fields.filename       !== undefined) doc.filename = fields.filename
  if (fields.filePath       !== undefined) doc.filePath = fields.filePath
  if (fields.linkedControls !== undefined) doc.linkedControls = Array.isArray(fields.linkedControls) ? fields.linkedControls : []
  doc.updatedAt = nowISO()
  doc.version   = (doc.version || 1) + 1
  docs[idx] = doc
  save(docs)
  return publicDoc(doc)
}

function del(id, deletedBy) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return false
  // Soft-Delete: do NOT delete physical file here
  docs[idx].deletedAt = new Date().toISOString()
  docs[idx].deletedBy = deletedBy || null
  save(docs)
  return true
}

function permanentDelete(id) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return false
  const doc = docs[idx]
  // delete physical file if exists (only on hard delete)
  if (doc.filePath && fs.existsSync(doc.filePath)) {
    try { fs.unlinkSync(doc.filePath) } catch {}
  }
  docs.splice(idx, 1)
  save(docs)
  return true
}

function restore(id) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  docs[idx].deletedAt = null
  docs[idx].deletedBy = null
  save(docs)
  return publicDoc(docs[idx])
}

function getDeleted() {
  return load().filter(d => d.deletedAt).map(d => publicDoc(d))
}

function getFilePath(id) {
  const doc = load().find(d => d.id === id)
  return doc ? doc.filePath : null
}

// Strip filePath from public responses (internal path)
function publicDoc(doc) {
  const { filePath, ...rest } = doc
  return rest
}

ensureDir()

// ── Seed: Architekturdokumentation als admin-intern Guidance ─────────────────

const ARCH_DOCS_ROOT = path.join(__dirname, '../../docs/architecture')
const PROJECT_ROOT   = path.join(__dirname, '../../')

const ARCH_SEED = [
  {
    seedId:   'seed_readme',
    title:    'ISMS Builder – Projektübersicht (README)',
    srcFile:  path.join(PROJECT_ROOT, 'README.md'),
  },
  {
    seedId:   'seed_contributing',
    title:    'Beitrag leisten – Developer Guide (CONTRIBUTING)',
    srcFile:  path.join(PROJECT_ROOT, 'CONTRIBUTING.md'),
  },
  {
    seedId:   'seed_c4',
    title:    'Architektur-Diagramme (C4 Model)',
    srcFile:  path.join(ARCH_DOCS_ROOT, 'c4-diagrams.md'),
  },
  {
    seedId:   'seed_datamodel',
    title:    'Datenmodell – JSON-Schemas aller Module',
    srcFile:  path.join(ARCH_DOCS_ROOT, 'data-model.md'),
  },
  {
    seedId:   'seed_openapi',
    title:    'API-Referenz (OpenAPI 3.0)',
    srcFile:  path.join(ARCH_DOCS_ROOT, 'openapi.yaml'),
    wrapCode: 'yaml',   // wrap non-markdown files in fenced code block
  },
]

function seedArchitectureDocs() {
  const docs = load()
  let changed = false

  for (const entry of ARCH_SEED) {
    // Skip if already seeded (check by seedId marker in content)
    if (docs.some(d => d.seedId === entry.seedId && !d.deletedAt)) continue
    if (!fs.existsSync(entry.srcFile)) continue

    let content = fs.readFileSync(entry.srcFile, 'utf8')
    if (entry.wrapCode) {
      content = `\`\`\`${entry.wrapCode}\n${content}\n\`\`\``
    }

    docs.push({
      id:          'guid_arch_' + entry.seedId,
      seedId:      entry.seedId,
      category:    'admin-intern',
      title:       entry.title,
      type:        'markdown',
      content,
      minRole:     'admin',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      deletedAt:   null,
      deletedBy:   null,
      createdBy:   'system',
      linkedControls: [],
      linkedPolicies: [],
    })
    changed = true
  }

  if (changed) save(docs)
}

const DEMO_GUIDE_SEED_ID = 'seed_demo_overview'
const DEMO_GUIDE_CONTENT = `# Demo-Betrieb – Übersicht & Übergabe in den Produktivbetrieb

> Dieser Beitrag erscheint automatisch, solange das System im Demo-Modus betrieben wird.
> Er erklärt die vorhandenen Demo-Daten, Zugangsdaten und den Weg in den Produktivbetrieb.

---

## Demo-Zugangsdaten

| Benutzername | Passwort    | Rolle         | Domäne | Besonderheiten                      |
|---|---|---|---|---|
| admin        | adminpass   | Administrator | Global | Voller Zugriff, CISO + DSO-Funktion |
| alice        | alicepass   | Abteilungsleiter | IT  | Zugriff auf Guidance & Risiken      |
| bob          | bobpass     | Leser         | HR     | Nur-Lese-Zugriff                    |

> **Sicherheitshinweis:** Diese Passwörter sind öffentlich bekannt. Vor dem Produktiveinsatz müssen alle Passwörter geändert werden.

---

## Vorhandene Demo-Daten

Das System enthält realistische Beispieldaten für folgende Module:

| Modul | Demo-Inhalt |
|---|---|
| **Richtlinien (Templates)** | Informationssicherheitsrichtlinie, Passwort-Policy, BYOD-Richtlinie, Backup-Policy, Zugangskontroll-Policy (je als Draft / Review / Approved) |
| **SoA** | 313 Controls über 8 Frameworks (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — alle bearbeitbar |
| **Risikomanagement** | 12 realistische Risiken mit Multi-Framework-Verlinkung (Ransomware, Phishing, Insider-Threat, Supply-Chain-Angriff u.a.) |
| **GDPR & Datenschutz** | Verarbeitungsverzeichnis (VVT), Auftragsverarbeitungsverträge (AV), TOMs, DSFA-Einträge, 72h-Timer-Demo |
| **Assets** | 8 Unternehmens-Assets (Server, Workstations, ERP, Cloud-Services, Netzwerkinfrastruktur) mit Klassifizierung |
| **Lieferketten** | 6 Lieferanten (Microsoft, DATEV, SAP, Cisco, AWS EMEA, Hetzner) inkl. NIS2/EUCS-Verlinkung |
| **BCM / BCP** | 8 Business-Impact-Analysen, 7 Continuity-Pläne, 6 Übungen |
| **Governance** | 3 Management-Reviews mit Maßnahmen und Meetingprotokollen |
| **Training** | 3 Schulungsmaßnahmen (ISO-Awareness, DSGVO, Phishing-Simulation) |
| **Rechtliches (Legal)** | 3 Verträge, 2 NDAs, 2 Datenschutzrichtlinien |
| **Sicherheitsziele** | 4 KPI-Ziele mit Fortschrittsbalken (Vulnerability-Response, Patch-Compliance, Phishing-Rate, Awareness) |
| **Vorfälle (Inbox)** | 10 Demo-Meldungen aus dem öffentlichen Vorfall-Meldeformular |
| **Guidance** | Systemhandbuch, Rollen-Dokumentation, Policy-Prozesse, SoA-Audit-Guide |

---

## Übergang in den Produktivbetrieb

### Schritt-für-Schritt

1. **Admin-Konsole öffnen** → Tab **Wartung**
2. **Demo-Reset durchführen:**
   - Sektion "Demo-Reset" anklicken
   - Im Bestätigungs-Dialog das Wort \`RESET\` eintippen
   - Das System exportiert automatisch alle Demo-Daten als JSON-Download (Backup)
   - Alle Moduldaten werden geleert, alle Benutzer außer \`admin\` gelöscht
   - Admin-Passwort wird auf \`adminpass\` zurückgesetzt, 2FA deaktiviert
3. **Auf die Login-Seite weiterleitet** — der gelbe Banner bestätigt den erfolgreich abgeschlossenen Reset
4. **Mit \`admin\` / \`adminpass\` anmelden** — Banner verschwindet, System ist produktionsbereit
5. **Sofort Passwort ändern:** Einstellungen → Passwort ändern
6. **2FA einrichten:** Einstellungen → 2FA aktivieren
7. **Eigene Benutzer anlegen:** Admin-Konsole → Tab Benutzer
8. **Eigene Inhalte erstellen:** alle Module sind leer und einsatzbereit

### Was bleibt nach dem Reset erhalten?

| Erhalten | Geleert |
|---|---|
| SoA-Controls (alle 313) | Templates / Policies |
| Dropdown-Listen | Risiken |
| Organisations-Einstellungen | Assets, BCM, Governance |
| (Admin-User) | Lieferanten, Legal, Training |
| | GDPR-Daten, Guidance |
| | Audit-Log, Sicherheitsziele |

---

## Demo-Daten wiederherstellen

Falls die Demo erneut gezeigt werden soll:

1. **Admin-Konsole → Wartung → "Demo-Daten importieren"**
2. Die beim Demo-Reset heruntergeladene JSON-Datei auswählen
3. Alle Moduldaten werden wiederhergestellt
4. alice und bob werden mit Original-Passwörtern und ohne 2FA neu angelegt
5. Der admin-Account bleibt unverändert

---

## Weitere Informationen

- **Architekturdokumentation & API-Referenz:** Guidance → Admin-intern
- **Rollenbeschreibungen:** Guidance → Rollen & Verantwortlichkeiten
- **Projektseite:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Lizenz:** GNU Affero General Public License v3.0 (AGPL-3.0)
`

function seedDemoDoc() {
  const docs = load()
  let changed = false
  const existing = docs.find(d => d.seedId === DEMO_GUIDE_SEED_ID && !d.deletedAt)
  if (!existing) {
    docs.unshift({
      id:             'guid_demo_overview',
      seedId:         DEMO_GUIDE_SEED_ID,
      category:       'systemhandbuch',
      title:          'Demo-Betrieb – Übersicht & Übergabe in den Produktivbetrieb',
      type:           'markdown',
      content:        DEMO_GUIDE_CONTENT,
      pinOrder:       1,
      minRole:        null,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      deletedAt:      null,
      deletedBy:      null,
      createdBy:      'system',
      linkedControls: [],
      linkedPolicies: [],
    })
    changed = true
  } else if (existing.pinOrder == null) {
    existing.pinOrder = 1
    changed = true
  }
  // pinOrder 5 für bestehenden Systemhandbuch-Beitrag setzen (falls noch nicht gesetzt)
  const sysDoc = docs.find(d => d.id === 'guid_system_001' && !d.deletedAt)
  if (sysDoc && sysDoc.pinOrder == null) { sysDoc.pinOrder = 5; changed = true }
  if (changed) save(docs)
}

// ── Rollen-Bedienungsanleitungen ─────────────────────────────────────────────

const ROLE_GUIDES = [
  {
    seedId:   'seed_guide_ciso',
    id:       'guid_guide_ciso',
    pinOrder: 10,
    title:    'Bedienungsanleitung: CISO / Informationssicherheitsbeauftragter (ISB)',
    minRole:  null,
    content: `# Bedienungsanleitung: CISO / ISB

Der CISO (Chief Information Security Officer) bzw. Informationssicherheitsbeauftragte (ISB) trägt die Gesamtverantwortung für das ISMS. Diese Anleitung erklärt die wichtigsten Module und täglichen Aufgaben.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **Risikomanagement** | Risiken erfassen, bewerten, behandeln | Menü: Risiken |
| **SoA** | Controls bewerten, Anwendbarkeit & Status pflegen | Menü: SoA |
| **Sicherheitsziele** | KPIs definieren, Fortschritt verfolgen | Menü: Sicherheitsziele |
| **Vorfälle (CISO-Inbox)** | Gemeldete Sicherheitsvorfälle bearbeiten | Menü: Vorfälle |
| **Lieferketten** | Lieferanten überwachen, NIS2-Pflichten | Menü: Lieferketten |
| **BCM / BCP** | Business Impact Analysen, Pläne, Übungen | Menü: BCM |
| **Governance** | Management-Reviews, Maßnahmenpakete | Menü: Governance |
| **Reports** | Compliance-Matrix, Gap-Report, CSV-Export | Menü: Reports |
| **Einstellungen (CISO)** | SLA, Meldepflicht-Schwelle, Eskalations-E-Mail | Menü: Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### Risiken bewerten
1. **Risiken → Neue Risiko** — Bedrohung, Wahrscheinlichkeit (1–5), Auswirkung (1–5) eintragen
2. Score = Wahrscheinlichkeit × Auswirkung (automatisch berechnet)
3. **Behandlungsmaßnahmen** per Klick auf einen Risikoeintrag → Tab "Behandlung"
4. Verknüpfung mit SoA-Controls über "🔗 Verknüpfungen" im Bearbeitungsformular

### SoA-Controls pflegen
1. **SoA → Framework-Tab** wählen (ISO 27001, NIS2, EUCS, BSI …)
2. Control anklicken → Status setzen (applicable / not-applicable / partial)
3. Begründung und Maßnahmen eintragen
4. **Inline-Edit:** Doppelklick auf ein Feld für schnelle Änderungen

### NIS2-Meldepflicht (72h-Frist)
- Sicherheitsvorfälle mit "Meldepflichtig"-Status in CISO-Inbox → BSI-Meldung vorbereiten
- Meldepflicht-Schwelle in **Einstellungen → CISO/ISB** konfigurieren
- Timer läuft ab Erfassung; Eskalations-E-Mail automatisch nach SLA

### Management-Review vorbereiten
1. **Governance → Management-Review → Neuer Review**
2. Tagesordnung, Teilnehmer, Beschlüsse eintragen
3. Maßnahmen direkt im Review verknüpfen
4. **Reports → Compliance-Matrix** als Anlage zum Review exportieren (CSV)

---

## CISO-Einstellungen konfigurieren
**Einstellungen → Abschnitt "CISO / ISB":**
- Eskalations-E-Mail (Benachrichtigung bei kritischen Vorfällen)
- Response-SLA in Stunden
- Meldepflicht-Schwelle (ab welchem Risikoscore wird NIS2-Meldung ausgelöst)
- Meldepflichtige Vorfallsarten

---

## Reports & Nachweise
| Report | Aufruf | Format |
|---|---|---|
| Compliance-Matrix | Reports → Compliance-Matrix | Tabelle + CSV |
| Gap-Report (fehlende Controls) | Reports → Gap-Report | Tabelle + CSV |
| Framework-Übersicht | Reports → Framework | Tabelle |
| Risiko-Liste | Risiken → Export (CSV) | CSV |

---

## Hinweise zur Weisungsunabhängigkeit
Der CISO/ISB berichtet direkt an die Geschäftsführung (ISO 27001 Kap. 5.1).
Die Funktion darf nicht in Konflikt mit operativen IT-Aufgaben stehen.
`,
  },
  {
    seedId:   'seed_guide_dsb',
    id:       'guid_guide_dsb',
    pinOrder: 20,
    title:    'Bedienungsanleitung: DSB / Datenschutzbeauftragter (GDPO)',
    minRole:  null,
    content: `# Bedienungsanleitung: DSB / Datenschutzbeauftragter (GDPO)

Der Datenschutzbeauftragte (DSB / GDPO) überwacht die Einhaltung der DSGVO und verwandter Datenschutzvorschriften.

> **Weisungsunabhängigkeit:** Der DSB ist gemäß Art. 38 Abs. 3 DSGVO bei der Ausübung seiner Aufgaben weisungsfrei und darf wegen seiner Aufgabenerfüllung nicht abberufen oder benachteiligt werden. Er berichtet unmittelbar an die höchste Managementebene.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **VVT** | Verarbeitungsverzeichnis (Art. 30 DSGVO) | Datenschutz → VVT |
| **AV-Verträge** | Auftragsverarbeitungsverträge prüfen | Datenschutz → AV |
| **DSFA** | Datenschutz-Folgenabschätzung (Art. 35) | Datenschutz → DSFA |
| **TOMs** | Technische & org. Maßnahmen dokumentieren | Datenschutz → TOMs |
| **DSAR** | Betroffenenrechte, Auskunftsersuchen | Datenschutz → DSAR |
| **72h-Timer** | Meldepflicht-Fristenüberwachung | Datenschutz → Vorfälle |
| **Löschprotokoll** | Art. 17 Löschungsnachweis | Datenschutz → Löschprotokoll |
| **Datenschutzrichtlinien** | Aktuelle Policies verwalten | Rechtliches → Policies |
| **Einstellungen (GDPO)** | DSAR-Fristen, DSB-Kontakt, Behörden | Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### Verarbeitungsverzeichnis pflegen (VVT)
1. **Datenschutz → VVT → Neuer Eintrag**
2. Pflichtfelder: Bezeichnung, Zweck, Rechtsgrundlage (Art. 6/9), Datenkategorien, Betroffene, Empfänger, Löschfristen
3. Drittlandübermittlung: Land + Garantie (SCCs, BCRs) eintragen
4. CSV-Export über den "CSV"-Button in der Filter-Leiste

### DSFA durchführen (Art. 35 DSGVO)
1. **Datenschutz → DSFA → Neue Abschätzung**
2. Schwellenwert-Prüfung: Risikobewertung für Rechte und Freiheiten
3. Vorgesehene Maßnahmen und Restrisiko dokumentieren
4. Status: Entwurf → In Prüfung → Abgeschlossen

### 72h-Meldepflicht verwalten
1. Datenschutzverletzung in **Datenschutz → Vorfälle** erfassen
2. System startet automatisch 72h-Countdown ab Erfassung
3. Bei Ablauf: Meldung an Aufsichtsbehörde dokumentieren
4. Behörden-Kontakt in **Einstellungen → DSB/GDPO** hinterlegen

### DSAR bearbeiten (Auskunftsersuchen)
1. **Datenschutz → DSAR → Neues Ersuchen**
2. Fristberechnung automatisch nach GDPO-Einstellungen (Standard: 30 Tage, verlängerbar auf 90 Tage)
3. Status: Eingegangen → In Bearbeitung → Abgeschlossen / Abgelehnt

---

## GDPO-Einstellungen konfigurieren
**Einstellungen → Abschnitt "DSB / GDPO":**
- DSAR-Standardfrist (Tage)
- Verlängerte Frist (bei komplexen Ersuchen)
- Zuständige Datenschutzbehörde
- Standard-Antworttext für Betroffene

---

## Nachweise & Dokumentation
| Dokument | Aufruf | Art. DSGVO |
|---|---|---|
| Verarbeitungsverzeichnis (CSV) | VVT → CSV exportieren | Art. 30 |
| DSFA-Bericht | DSFA → Detailansicht | Art. 35 |
| AV-Vertragsübersicht | Datenschutz → AV | Art. 28 |
| TOM-Nachweis | Datenschutz → TOMs | Art. 32 |
| Löschprotokoll | Datenschutz → Löschprotokoll | Art. 17 |
`,
  },
  {
    seedId:   'seed_guide_revision',
    id:       'guid_guide_revision',
    pinOrder: 30,
    title:    'Bedienungsanleitung: Interne Revision',
    minRole:  null,
    content: `# Bedienungsanleitung: Interne Revision

Die Interne Revision prüft die Wirksamkeit des ISMS und der internen Kontrollsysteme unabhängig von operativen Stellen.

> **Weisungsunabhängigkeit:** Die Interne Revision ist gemäß AktG § 91 Abs. 2, IDW PS 321 und IIA-Standard 1100 funktional und organisatorisch unabhängig. Sie untersteht direkt dem Vorstand / der Geschäftsführung bzw. dem Prüfungsausschuss des Aufsichtsrats und ist von operativen Bereichen weisungsfrei.

---

## Zuständige Module im Überblick

| Modul | Prüfgegenstand | Wo im System |
|---|---|---|
| **SoA** | Umsetzungsstatus aller Controls | Menü: SoA |
| **Reports** | Compliance-Matrix, Gap-Bericht, Review-Zyklen | Menü: Reports |
| **Audit-Log** | Nachvollziehbarkeit aller Systemaktionen | Admin-Konsole → Audit-Log |
| **Risikomanagement** | Vollständigkeit Risikoregister, Behandlungsstand | Menü: Risiken |
| **Governance** | Management-Review-Protokolle, Maßnahmenstand | Menü: Governance |
| **Training** | Schulungsnachweis, Abdeckungsgrad | Menü: Training |
| **BCM** | Übungsberichte, BIA-Aktualität | Menü: BCM |
| **Einstellungen (Revision)** | Prüfungsumfang, Rhythmus, Berichtswesen | Einstellungen |

---

## Prüfungshandlungen – Typische Aufgaben

### Compliance-Stand erheben
1. **Reports → Compliance-Matrix:** Ampeldarstellung Control × Gesellschaft
2. Rote Felder = fehlende Umsetzung → Nachfragen beim Modulverantwortlichen
3. **Reports → Gap-Report:** alle Controls mit Status "not applicable" oder ohne Maßnahme
4. CSV-Export als Arbeitspapier

### SoA-Controls prüfen
1. **SoA → Framework auswählen** (ISO 27001, NIS2, BSI …)
2. Filter "not-applicable" setzen → Begründungen auf Plausibilität prüfen
3. Stichproben: Controls "applicable" mit Status "planned/partial" → Umsetzungsnachweis anfordern

### Audit-Log auswerten (Admin-Zugang erforderlich)
1. **Admin-Konsole → Audit-Log**
2. Filter nach Zeitraum, Benutzer oder Aktion
3. Kritische Aktionen: permanent_delete, demo_reset, settings-Änderungen

### Risikobewertung nachvollziehen
1. **Risiken → Liste:** Score, Datum der letzten Bearbeitung, Behandlungsstatus prüfen
2. Unbehandelte Hochrisiken (Score ≥ 15) identifizieren
3. Verknüpfte Controls im Detail-Panel nachvollziehen

### Management-Reviews beurteilen
1. **Governance → Management Reviews:** Vollständigkeit der Tagesordnung, Beschlussfassung
2. Maßnahmenplan: offene Punkte, Verantwortliche, Fälligkeiten
3. Lücken zwischen Review-Beschlüssen und SoA-Umsetzung dokumentieren

---

## Revisions-Einstellungen konfigurieren
**Einstellungen → Abschnitt "Interne Revision":**
- Revisionsleiter, E-Mail
- Prüfungsumfang (Freitext)
- Berichtsempfänger (GF / Aufsichtsrat / Prüfungsausschuss)
- Prüfungsrhythmus, letztes / nächstes Audit-Datum
- Externer Wirtschaftsprüfer

---

## Prüfungsberichte & Arbeitspapiere
| Nachweis | Abruf | Hinweis |
|---|---|---|
| Compliance-Matrix | Reports → Compliance-Matrix + CSV | Stichtag festhalten |
| Gap-Report | Reports → Gap-Report + CSV | Delta zum Vorjahr dokumentieren |
| Risiko-Export | Risiken → CSV | Vollständigkeitsprüfung |
| Audit-Log-Export | Admin → Audit-Log → CSV | Manipulationsschutz beachten |
| Training-Nachweise | Training → Liste | Abdeckungsgrad je Abteilung |
`,
  },
  {
    seedId:   'seed_guide_qmb',
    id:       'guid_guide_qmb',
    pinOrder: 40,
    title:    'Bedienungsanleitung: QMB / Qualitätsmanagementbeauftragter',
    minRole:  null,
    content: `# Bedienungsanleitung: QMB / Qualitätsmanagementbeauftragter

Der Qualitätsmanagementbeauftragte (QMB) koordiniert das QMS nach ISO 9001 bzw. branchenspezifischen Standards (IATF 16949, ISO 13485, AS9100) und stellt die Integration mit dem ISMS sicher.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **SoA – ISO 9001** | ISO 9001:2015 Controls bewerten | SoA → Tab "ISO 9001" |
| **Risikomanagement** | Risiken nach ISO 9001 Kap. 6.1 | Menü: Risiken |
| **Governance** | Management-Reviews (ISO 9001 Kap. 9.3) | Menü: Governance |
| **Training** | Schulungsmaßnahmen, Kompetenznachweis | Menü: Training |
| **Sicherheitsziele** | QM-Ziele mit KPI-Tracking | Menü: Sicherheitsziele |
| **Richtlinien** | QM-Handbuch, Verfahrensanweisungen | Menü: Richtlinien |
| **Reports** | Compliance-Matrix ISO 9001, Review-Zyklen | Menü: Reports |
| **Einstellungen (QMB)** | QMS-Scope, Norm, Zertifizierungsdaten | Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### ISO 9001 Controls pflegen
1. **SoA → Tab "ISO 9001"** aufrufen
2. Controls nach aktuellem Umsetzungsstand bewerten (applicable / partial / not-applicable)
3. Besonders relevant: Kap. 4 (Kontext), 6.1 (Risiken), 7 (Unterstützung), 8 (Betrieb), 9 (Bewertung), 10 (Verbesserung)
4. Verknüpfung mit Richtlinien über "🔗 Verknüpfungen"

### QM-Risiken verwalten
1. **Risiken → Neue Risiko** — ISO 9001 Controls in "🔗 Verknüpfungen" verknüpfen
2. Qualitätsbezogene Risiken: Lieferantenausfall, Produktfehler, Kompetenzlücken
3. Behandlungsmaßnahmen: FMEA-Ergebnisse als Maßnahmen dokumentieren

### QM-Ziele mit KPIs verfolgen
1. **Sicherheitsziele → Neue Ziel** (gilt für alle ISMS/QM-Ziele)
2. Zielwert, Ist-Wert, Einheit (%, Anzahl, Tage) und Frist definieren
3. Regelmäßig aktualisieren — Fortschrittsbalken zeigt Erreichungsgrad

### Management-Review (ISO 9001 Kap. 9.3)
1. **Governance → Management-Review → Neuer Review**
2. Pflichtthemen ISO 9001: Kundenfeedback, Audit-Ergebnisse, Zielstatus, Ressourcen
3. Beschlüsse als Maßnahmen hinterlegen (Verantwortlicher + Fälligkeitsdatum)
4. Reports → Review-Zyklen als Vorbereitung nutzen

### Schulungsmaßnahmen verwalten
1. **Training → Neue Maßnahme** — Titel, Thema, Zielgruppe, Termin, Pflicht (ja/nein)
2. Abschluss & Teilnahmequote dokumentieren
3. Kompetenznachweis für ISO 9001 Kap. 7.2 sichergestellt

---

## QMB-Einstellungen konfigurieren
**Einstellungen → Abschnitt "QMB / Qualitätsmanagement":**
- QMB-Name und E-Mail
- QMS-Scope (Anwendungsbereich)
- Geltende Norm (ISO 9001 / IATF 16949 / ISO 13485 / AS9100)
- Zertifizierungsstelle, Zertifikat-Gültigkeit
- Audit-Termine, Rezertifizierungsdatum

---

## Reports & Zertifizierungsunterlagen
| Dokument | Abruf | ISO 9001 Kap. |
|---|---|---|
| Compliance-Matrix ISO 9001 | Reports → Compliance-Matrix (Framework: ISO 9001) + CSV | 9.1.3 |
| Zielerreichung | Sicherheitsziele → Übersicht | 9.1 |
| Training-Nachweis | Training → Liste | 7.2 |
| Management-Review-Protokoll | Governance → Review → Detail | 9.3 |
| Risikobewertung | Risiken → Export CSV | 6.1 |
`,
  },
  {
    seedId:   'seed_guide_abtlg',
    id:       'guid_guide_abtlg',
    pinOrder: 50,
    title:    'Bedienungsanleitung: Abteilungsleiter / Fachverantwortlicher',
    minRole:  null,
    content: `# Bedienungsanleitung: Abteilungsleiter / Fachverantwortlicher

Diese Anleitung richtet sich an Abteilungsleiter (dept_head) und Fachverantwortliche, die für ihren Bereich Richtlinien, Risiken und Schulungen pflegen.

---

## Deine Rolle im ISMS

| Aufgabe | Modul | Zugriff |
|---|---|---|
| Richtlinien für deinen Bereich pflegen | Richtlinien | Lesen + Erstellen/Bearbeiten |
| Risiken melden und mitbewerten | Risikomanagement | Lesen + Bearbeiten |
| Schulungsmaßnahmen planen | Training | Lesen + Bearbeiten |
| Assets deines Bereichs verwalten | Asset-Management | Lesen + Bearbeiten |
| SoA-Controls kommentieren | SoA | Lesen (+ Inline-Edit mit contentowner) |
| Vorfälle melden | Öffentl. Meldeformular / Vorfälle | Melden + Lesen |

---

## Tagesgeschäft – Typische Aufgaben

### Richtlinie bearbeiten
1. **Richtlinien** im Menü aufrufen
2. Eigene Richtlinie aus der Baumstruktur auswählen
3. **Bearbeiten**-Button → Inhalt aktualisieren, Datum "Nächstes Review" setzen
4. Status auf **"In Review"** setzen, damit CISO/ISB die Freigabe erteilt
5. Nach Freigabe durch Contentowner erscheint Status **"Approved"**

### Risiko melden
1. **Risiken → Neues Risiko**
2. Bedrohung beschreiben, Eintrittswahrscheinlichkeit und Auswirkung schätzen (1–5)
3. Vorgeschlagene Maßnahme eintragen
4. Eigene Abteilung als "Owner" angeben

### Schulung planen
1. **Training → Neue Maßnahme**
2. Thema, Zielgruppe (Abteilung), Termin, Pflichtschulungs-Flag setzen
3. Nach Durchführung: Abschluss und Teilnehmeranzahl eintragen

### Sicherheitsvorfall melden
- **Von innen (eingeloggt):** Vorfälle → Neuer Vorfall
- **Von außen / anonym:** Login-Seite → "Sicherheitsvorfall melden" (kein Login nötig)
- Pflichtfelder: E-Mail, Art des Vorfalls, Beschreibung

---

## Dashboards & Übersichten nutzen

Das **Dashboard** zeigt dir:
- Aktuelle Risiken in deinem Bereich (Top 5)
- Anstehende Reviews und Fälligkeiten (14-Tage-Vorschau)
- Offene DSAR und 72h-Meldungen (falls GDPR-Zugriff)
- KPI-Karten aller aktiven Module

Der **Kalender** zeigt alle Fälligkeiten:
- Review-Termine für Richtlinien
- Schulungstermine
- Asset-EoL-Termine
- Vertragslaufzeiten

---

## Was du NICHT tun kannst (und warum)

| Gesperrte Aktion | Warum |
|---|---|
| Richtlinien genehmigen (Approved setzen) | Nur Contentowner / Admin (4-Augen-Prinzip) |
| Benutzer anlegen | Nur Admin |
| Richtlinien endgültig löschen | Nur Admin (Papierkorb vorhanden) |
| SoA-Controls genehmigen | Nur CISO / Contentowner |
| Admin-Konsole aufrufen | Nur Admin |

---

## Tipps

- **Namenssuche:** Suchfeld in der Topbar findet Richtlinien, Risiken und Controls global
- **Verknüpfungen:** In jedem Formular unter "🔗 Verknüpfungen" kannst du SoA-Controls und Richtlinien verknüpfen — hilfreich für den Compliance-Nachweis
- **Guidance:** Diese Seite enthält weitere Anleitungen für alle Module
`,
  },
]

function seedRoleGuides() {
  const docs = load()
  let changed = false
  for (const guide of ROLE_GUIDES) {
    const existing = docs.find(d => d.seedId === guide.seedId && !d.deletedAt)
    if (!existing) {
      docs.push({
        id:             guide.id,
        seedId:         guide.seedId,
        category:       'systemhandbuch',
        title:          guide.title,
        type:           'markdown',
        content:        guide.content,
        pinOrder:       guide.pinOrder,
        minRole:        guide.minRole,
        createdAt:      new Date().toISOString(),
        updatedAt:      new Date().toISOString(),
        deletedAt:      null,
        deletedBy:      null,
        createdBy:      'system',
        linkedControls: [],
        linkedPolicies: [],
      })
      changed = true
    } else if (existing.pinOrder == null) {
      existing.pinOrder = guide.pinOrder
      changed = true
    }
  }
  if (changed) save(docs)
}

module.exports = { getAll, getByCategory, getById, create, update, delete: del, permanentDelete, restore, getDeleted, getFilePath, VALID_CATEGORIES, seedArchitectureDocs, seedDemoDoc, seedRoleGuides }
