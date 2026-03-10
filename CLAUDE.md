# CLAUDE.md – ISMS Builder (Confluence_ISMS_build)

Diese Datei wird von Claude Code automatisch bei jedem Start geladen.
Die folgenden Regeln sind **verbindlich** und müssen **vor und nach jeder Änderung** befolgt werden.

## Pflichtschritte bei JEDER Änderung

### 1. Vor Änderungen: Backup
```bash
bash scripts/backup-and-deploy.sh
```
Immer ausführen, bevor Code, Konfiguration oder Daten geändert werden.

### 2. Nach Änderungen: Dokumentation + Scripts aktualisieren
`docs/ISMS-build-documentation.md` muss nach jeder Änderung aktualisiert werden:
- Neue Features → in bestehendem Abschnitt ergänzen oder neuen Abschnitt anlegen
- Geänderte API-Routen → Abschnitt 7 (API) aktualisieren
- Neue Konfigurationsfelder → Abschnitt 3 (Konfiguration) aktualisieren
- Scripts geändert → Abschnitt 6 (Scripts) aktualisieren

Auch `scripts/` aktualisieren wenn neue Dateien, Module oder Start/Stop-Schritte nötig sind (z.B. neue Store-Dateien in Backup-Scripts eintragen).

### 3. Tests ausführen
```bash
npm test
```
Alle Tests müssen grün sein bevor die Arbeit als abgeschlossen gilt.

## Kommunikationsregeln

- Jede Änderung die den **Server-Betrieb** betrifft (SSL, Port, .env, Zertifikate) aktiv dem User mitteilen
- **Niemals** `.env`, `ssl/`, oder Zertifikatsdateien als Nebeneffekt von Tests verändern
- Wenn eine dieser Regeln nicht befolgt werden konnte: explizit kommunizieren warum

## Projektstruktur (Kurzübersicht)

- `server/` — Node.js/Express API
- `server/db/` — Datenbankstores (JSON + SQLite)
- `server/routes/` — Express-Router
- `ui/` — Vanilla-JS SPA (Atlassian Dark Theme)
- `data/` — Persistierte Daten (JSON / SQLite)
- `docs/` — Dokumentation (Haupt: `ISMS-build-documentation.md`)
- `tests/` — Jest + Supertest Testsuites
- `scripts/` — Betriebsscripts (backup, start, stop, deploy)
- `.env` — JWT_SECRET, SMTP, STORAGE_BACKEND, SSL

## Technologie-Stack

- Node.js + Express, Vanilla JS, no framework
- Auth: JWT (Cookie `sm_session`), bcryptjs, TOTP 2FA
- RBAC: reader(1) < editor/dept_head(2) < contentowner/auditor(3) < admin(4)
- Persistence: JSON (dev) oder SQLite via `better-sqlite3` (prod, `STORAGE_BACKEND=sqlite`)
- Tests: Jest + Supertest (`npm test`, --runInBand)

## Wichtige Dateien

| Datei | Zweck |
|---|---|
| `server/index.js` | Server-Einstiegspunkt, Router-Mounts |
| `server/auth.js` | JWT-Auth, RBAC-Ranks, Session |
| `server/rbacStore.js` | Benutzerverwaltung (inkl. `functions[]`) |
| `server/notifier.js` | Täglicher E-Mail-Digest |
| `server/mailer.js` | SMTP (dynamisch, kein Cache) |
| `server/db/orgSettingsStore.js` | Org-Einstellungen, SMTP, navOrder |
| `ui/app.js` | SPA-Logik (alle Render-Funktionen) |
| `ui/index.html` | Haupt-UI Shell |
| `docs/ISMS-build-documentation.md` | Vollständige Architekturdokumentation |
