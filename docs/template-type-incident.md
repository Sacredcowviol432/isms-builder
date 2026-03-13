# Template-Typ: Incident (Sicherheitsvorfall-Dokumentation)

> **Kurzdefinition:** Incident-Dokumente beschreiben, wie mit Sicherheitsvorfällen umgegangen wird — von der Erkennung über die Reaktion bis zur Nachbereitung und Meldepflicht.

---

## Was ist ein Incident-Dokument?

Sicherheitsvorfälle (Incidents) sind unvermeidbar. Die Frage ist nicht ob sie passieren, sondern ob man vorbereitet ist. Incident-Dokumente im ISMS Builder sind die schriftliche Vorbereitung auf den Ernstfall:

- **Incident Response Policy:** Die Grundsatzentscheidung — was ist ein Incident, wie reagieren wir grundsätzlich?
- **Incident Response Procedure:** Der konkrete Ablaufplan — wer ruft wen an, was wird gesichert, was wird gemeldet?
- **Kommunikationsplan:** An wen kommunizieren wir wann was — intern und extern?
- **Nachbereitung (Post-Incident Review):** Was haben wir gelernt?

---

## Die vier Phasen eines Incidents — und welche Dokumente helfen

```
1. ERKENNUNG          → Wer meldet wie? (Procedure: Meldewege)
2. EINDÄMMUNG         → Was tun wir sofort? (Procedure: Sofortmaßnahmen)
3. BESEITIGUNG        → Wie stellen wir wieder her? (Procedure: Recovery)
4. NACHBEREITUNG      → Was lernen wir? (Template: Post-Incident-Report)
```

---

## Incident im ISMS Builder — zwei verschiedene Konzepte

Auch hier — ähnlich wie bei Risk — gibt es zwei Dinge:

| | Incident-Template (Sidebar) | GDPR-Vorfall / Public Incident (Module) |
|---|---|---|
| **Was** | Vorbereitende Dokumentation, Pläne | Konkreter gemeldeter Vorfall |
| **Beispiel** | „Incident Response Procedure v2.0" | „Datenpanne 2026-03-10: Kundendaten exponiert" |
| **Zweck** | Vorbereitung | Protokollierung und Meldung |
| **Wo** | Sidebar → Incident | Navigation → GDPR (72h-Timer) / Login-Seite (öffentlich) |

---

## Typische Incident-Dokumente

| Dokument | Beschreibung |
|----------|--------------|
| **Incident Response Policy** | Grundsatz: Was ist ein Incident? Klassifizierung (P1–P4), Eskalationspflichten |
| **Incident Response Procedure** | Schritt-für-Schritt: Erkennung → Meldung → Analyse → Eindämmung → Recovery → Review |
| **Kommunikations- und Benachrichtigungsplan** | Wer wird wann informiert: IT, CISO, Geschäftsführung, BSI, Datenschutzbehörde, Presse |
| **Evidence Preservation Procedure** | Wie werden Beweise gesichert ohne sie zu kontaminieren (forensisch korrekt) |
| **Post-Incident-Review-Template** | Vorlage für die Nachbereitung: Timeline, Root Cause, Lessons Learned, Maßnahmen |
| **Business Continuity Plan** | Was tun wenn Systeme ausfallen? (→ BCM-Modul im ISMS Builder) |

---

## Konkretes Beispiel: Ransomware-Angriff

> **Szenario:** Montagmorgen, 08:15 Uhr. Ein Mitarbeiter meldet dass sein Desktop verschlüsselt ist und eine Lösegeldforderung anzeigt.

**Ohne Incident-Dokumente:** Chaos. Jeder ruft jeden an. Niemand weiß ob Backups existieren. Die Datenschutzbehörde wird zu spät informiert.

**Mit Incident-Dokumenten im ISMS Builder:**

1. Mitarbeiter meldet über Login-Seite → „Sicherheitsvorfall melden" (kein Login nötig)
2. CISO erhält Benachrichtigung (E-Mail-Notifier)
3. CISO öffnet die **Incident Response Procedure** → klarer Ablauf:
   - Schritt 1: Betroffene Systeme vom Netz trennen (nicht ausschalten!)
   - Schritt 2: IT-Forensik benachrichtigen (Kontakt im Dokument hinterlegt)
   - Schritt 3: Backup-Verfügbarkeit prüfen (Procedure verlinkt auf Backup-Policy)
   - Schritt 4: 72h-Timer starten (DSGVO-Meldepflicht prüfen → GDPR-Modul)
4. Kommunikationsplan → Geschäftsführung, BSI (KRITIS?), Datenschutzbehörde
5. Nach Bereinigung: Post-Incident-Review-Template ausfüllen → neues Risiko anlegen

---

## DSGVO und die 72-Stunden-Frist

Besonders wichtig: Bei Datenpannen gilt Art. 33 DSGVO — **72 Stunden** Meldefrist an die Datenschutzbehörde.

Im ISMS Builder:
- GDPR-Modul → Reiter „Vorfälle" → 72h-Timer startet automatisch bei Anlage
- Incident-Template „DSGVO-Meldung Datenpanne" als Vorlage für die behördliche Meldung
- Öffentliches Meldeformular auf der Login-Seite für externe Meldungen (z.B. Kunden, Mitarbeiter)

---

## Incident im Audit

| Audit-Frage | Nachweis |
|-------------|----------|
| „Haben Sie einen Incident-Response-Plan?" | Incident Response Procedure (freigegeben, versioniert) |
| „Wie klassifizieren Sie Vorfälle?" | Incident Response Policy (Klassifizierungsmatrix) |
| „Können Sie einen vergangenen Vorfall nachweisen?" | GDPR-Modul → Vorfall-Protokoll mit Timeline |
| „Wie stellen Sie die 72h-Meldepflicht sicher?" | GDPR-Modul → 72h-Timer + Meldevorlage |
| „Was haben Sie aus Vorfällen gelernt?" | Post-Incident-Review-Dokumente, neue Risikoeinträge |
