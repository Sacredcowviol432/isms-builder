# Gepinnte Abhängigkeiten — Begründungen

Dieses Dokument listet alle npm-Pakete, die bewusst auf eine bestimmte Version fixiert sind
und **nicht** durch Dependabot oder `npm update` aktualisiert werden dürfen.

> Die Datei wird durch `scripts/security-check.sh` und die CI-Pipeline automatisch ausgewertet.
> Ein Verstoß gegen eine hier dokumentierte Pin-Regel bricht den Build ab.

---

## pdf-parse — fixiert auf `1.1.1`

| Feld        | Wert |
|-------------|------|
| Paket       | `pdf-parse` |
| Gepinnte Version | `1.1.1` (exakt, kein `^` oder `~`) |
| Aktuelle Stable | ≥ 2.x |
| Status      | **NICHT UPDATEN** |
| Eingetragen | 2026-03-12 |

### Grund

Ab Version 2.0.0 hat `pdf-parse` eine inkompatible API-Änderung:

- **v1.x**: Default-Export ist direkt die Parse-Funktion
  ```js
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)   // ✓ funktioniert
  ```
- **v2.x**: Default-Export ist eine Klasse (`PDFParse`), die Funktion heißt anders
  ```js
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse()
  const data = await parser.parse(buffer)  // anderes Interface
  ```

### Betroffene Datei

`server/ai/greenobonePdfParser.js` — Greenbone PDF-Report-Parser

### Vorgehen bei Update

1. `server/ai/greenobonePdfParser.js` vollständig auf die neue API migrieren
2. Mit einem echten Greenbone-PDF-Report testen
3. Version in `package.json` und in dieser Datei aktualisieren
4. Eintrag aus der Dependabot-Ignore-Liste entfernen

---

## Ausstehende Major-Version-Migrationen

Pakete die aktuell auf einer älteren Major-Version verbleiben und auf eine neue migriert werden müssen.
Diese werden **nicht** automatisch durch Dependabot oder `npm update` aktualisiert (Major-Versions-Sperre).
Jede Migration erfordert explizites Testen und eine eigene CHANGELOG-Version.

---

### express — v4 → v5

| Feld | Wert |
|------|------|
| Aktuell | `4.22.x` |
| Ziel | `5.x` |
| Status | **ausstehend** |

**Breaking Changes (Auswahl):**
- `res.json()` akzeptiert keine zyklischen Objekte mehr
- `req.query` Parser-Verhalten geändert
- `router.param()` Callback-Signatur geändert
- `app.router` entfernt

**Vorgehen:** Alle 17 Route-Dateien + `server/index.js` testen; insbesondere Error-Handler und Query-Parsing.

---

### bcryptjs — v2 → v3

| Feld | Wert |
|------|------|
| Aktuell | `2.4.3` |
| Ziel | `3.x` |
| Status | **ausstehend** |

**Prüfen:** Hash-Kompatibilität — bestehende Passwort-Hashes aus `rbac_users.json` müssen mit v3 weiter verifizierbar sein. Vor Migration: Regressions-Test mit gespeicherten Hashes schreiben.

---

### dotenv — v16 → v17

| Feld | Wert |
|------|------|
| Aktuell | `16.6.x` |
| Ziel | `17.x` |
| Status | **ausstehend** |

**Prüfen:** Parse-Verhalten für mehrzeilige Werte (z.B. SSL-Zertifikatspfade mit Leerzeichen), `expand`-Modus, `override`-Option.

---

*Stand: 2026-03-12 — nach `npm update` (Minor/Patch), Major-Versionen bewusst zurückgehalten.*
