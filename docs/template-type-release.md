# Template-Typ: Release (Änderungs- und Freigabedokumentation)

> **Kurzdefinition:** Release-Dokumente steuern und dokumentieren Änderungen an IT-Systemen, Software und Infrastruktur — sie sind das Fundament eines kontrollierten Change-Managements nach ISO 27001 A.8.32.

---

## Was ist ein Release-Dokument?

Jede Änderung an einem produktiven IT-System ist ein potenzielles Sicherheitsrisiko. Ein unkontrolliertes Update kann Schwachstellen einführen, Konfigurationen überschreiben oder den Betrieb gefährden. Release-Dokumente stellen sicher dass:

- Änderungen **geplant** und **getestet** werden
- die richtigen Personen **freigeben**
- ein **Rollback-Plan** existiert
- alles **nachvollziehbar** dokumentiert ist

---

## Warum ist das relevant für ein ISMS?

ISO 27001 A.8.32 fordert explizit ein Change-Management-Verfahren. Ein Auditor wird fragen:

> *„Wie stellen Sie sicher, dass Änderungen an Ihren Systemen kontrolliert und sicher durchgeführt werden?"*

Die Antwort ist ein vollständiger Release-Prozess — dokumentiert im ISMS Builder.

---

## Typische Release-Dokumente

| Dokument | Beschreibung |
|----------|--------------|
| **Change Management Policy** | Grundsatz: Was ist ein Change? Standard vs. Notfall-Change, Genehmigungsstufen |
| **Change Management Procedure** | Ablauf: Antrag → Review → Test → Freigabe → Durchführung → Verifikation → Dokumentation |
| **Release Notes** | Was wurde in welcher Version geändert? (intern wie auch für Nutzer) |
| **Rollback-Plan** | Was tun wenn das Update schief geht? Schritt-für-Schritt-Rücknahme |
| **Test-Protokoll** | Welche Tests wurden vor dem Release durchgeführt? Ergebnisse |
| **Deployment-Checklist** | Vor-/Nachher-Prüfliste für jedes Deployment |
| **Notfall-Patch-Procedure** | Beschleunigter Prozess für kritische Sicherheitspatches (CVSS ≥ 9.0) |

---

## Konkretes Beispiel: Software-Update

> **Szenario:** Eine kritische Sicherheitslücke (CVE-2026-9999, CVSS 9.8) wird in der eingesetzten Webserver-Software entdeckt. Ein Patch ist verfügbar.

**Ohne Release-Prozess:** Der Sysadmin spielt den Patch direkt auf Produktion auf. Reboots führen zu 2h Ausfall. Die Config-Datei wird überschrieben. Der CISO erfährt es erst Tage später.

**Mit Release-Prozess im ISMS Builder:**

1. **Greenbone-Scan** → Schwachstelle als Risiko importiert (CVSS 9.8 Critical)
2. CISO gibt das Risiko frei → erscheint im Risk Register
3. Behandlungsmaßnahme angelegt: „Patch einspielen bis 2026-03-15"
4. **Notfall-Patch-Procedure** öffnen → beschleunigter Prozess (24h statt 5 Werktage)
5. Change-Request anlegen (Release-Template):
   - Betroffene Systeme: webserver-01, webserver-02
   - Rollback-Plan: Snapshot vom 2026-03-11 verfügbar
   - Testumgebung: Patch in Staging eingespielt, 4h beobachtet, kein Fehler
   - Freigabe durch: CISO + IT-Leitung
6. Deployment durchgeführt, Test-Protokoll ausgefüllt
7. Risiko-Status auf „geschlossen" setzen

---

## Release-Typen

| Typ | Beschreibung | Genehmigung | Zeitrahmen |
|-----|--------------|-------------|------------|
| **Standard Change** | Routine, bekanntes Risiko (z.B. monatliche Patches) | Vorab-Genehmigung durch Policy | Geplant |
| **Normal Change** | Neue Funktionen, Konfigurationsänderungen | Change Advisory Board (CAB) | Geplant, 5 Werktage |
| **Notfall Change** | Kritische Sicherheitspatches (CVSS ≥ 9.0) | CISO + IT-Leitung | 24–48 Stunden |

---

## Release und das Dependency-Management

Ein häufig übersehener Aspekt: auch **Softwareabhängigkeiten** (npm-Pakete, Python-Libraries, Docker-Images) sind „Changes" die einen Release-Prozess durchlaufen sollten.

Für den ISMS Builder selbst gilt:
- `npm update` (Minor/Patch) → Standard Change → dokumentiert in CHANGELOG.md
- Major-Version-Upgrade → Normal Change → eigene Release-Version, Tests, Freigabe
- Gepinnte Abhängigkeiten (z.B. `pdf-parse 1.1.1`) → keine Änderung ohne explizite Migration → dokumentiert in PINNED-DEPS.md

---

## Release-Dokumente im ISMS Builder

**Anlegen:** Sidebar → Release → Neues Dokument
**Empfohlene Nutzung:**
- Release Notes für jede ISMS-Builder-Version als Release-Template ablegen
- Change-Management-Policy als Policy-Template (→ Template-Typ Policy)
- Deployment-Checkliste als Procedure (→ Template-Typ Procedure)

**Verknüpfen:**
- mit ISO 27001 A.8.32 (Change Management)
- mit Risiken die durch diesen Release behoben werden
- mit dem SoA-Control A.8.8 (Vulnerability Management)

---

## Zusammenspiel aller Template-Typen am Beispiel Patch-Management

```
Change Management Policy            (Policy)
  └── Patch Management Procedure    (Procedure)
        └── Notfall-Patch-Procedure (Procedure)  ← CVSS ≥ 9.0
  └── Release Notes v1.33.2         (Release)    ← Was wurde gepatcht?
  └── Rollback-Plan Webserver       (Release)    ← Was wenn es schiefgeht?

Verknüpft mit:
  ├── SoA: ISO A.8.32 (Change Mgmt) → Status: implemented
  ├── SoA: ISO A.8.8  (Vuln. Mgmt)  → Status: implemented
  └── Risk: CVE-2026-9999 (CVSS 9.8) → Status: geschlossen
```

---

## Audit-Nachweis

| Audit-Frage | Nachweis |
|-------------|---------|
| „Haben Sie ein Change-Management?" | Change Management Policy (freigegeben) |
| „Wie gehen Sie mit Notfall-Patches um?" | Notfall-Patch-Procedure |
| „Zeigen Sie mir einen konkreten Change." | Release Notes + Risk-Eintrag mit Behandlungsmaßnahme |
| „Wie stellen Sie sicher dass Rollback möglich ist?" | Rollback-Plan als Release-Dokument |
| „ISO A.8.32 — wie umgesetzt?" | SoA: A.8.32 → Status implemented → verknüpft mit Policy + Procedure |
