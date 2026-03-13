# Template-Typ: Procedure (Verfahrensanweisung)

> **Kurzdefinition:** Eine Procedure beschreibt *wie* eine Policy konkret umgesetzt wird — Schritt für Schritt, nachvollziehbar und wiederholbar.

---

## Was ist eine Procedure?

Während eine Policy sagt „was" gelten soll, sagt eine Procedure „wie" man es tut. Sie ist die operative Umsetzungsanleitung zu einer übergeordneten Richtlinie. Procedures werden von Fachverantwortlichen geschrieben — nicht zwingend von der Geschäftsführung — und richten sich an Mitarbeiter, die eine Aufgabe ausführen müssen.

**Typische Merkmale:**
- Detaillierter als eine Policy (3–20 Seiten)
- Enthält Schritt-für-Schritt-Ablaufbeschreibungen
- Benennt konkrete Rollen und Verantwortlichkeiten (RACI)
- Verweist auf die übergeordnete Policy
- Kann Formulare, Checklisten oder Screenshots enthalten
- Ändert sich häufiger als eine Policy (bei Systemwechseln etc.)

---

## Typische Procedures im ISMS

| Procedure | Bezug zu Policy |
|-----------|-----------------|
| **Passwort-Verwaltung** | Passwort-Policy |
| **User-Onboarding / Offboarding** | Zugriffskontroll-Policy |
| **Sicherheitsvorfall melden und bearbeiten** | Incident-Response-Policy |
| **Backup-Durchführung und -Wiederherstellung** | Backup-Policy |
| **Patch-Management-Prozess** | Patch-Policy |
| **Datenschutz-Folgenabschätzung (DSFA)** | DSGVO-Richtlinie |
| **Schlüsselverwaltung** | Verschlüsselungs-Policy |
| **Change-Management** | Change-Policy |

---

## Konkretes Beispiel

> **Dokument:** „Verfahren Benutzer-Offboarding v2.1 — Alpha GmbH"
> **Status:** Freigegeben · **Owner:** IT-Leitung · **Bezug:** Zugriffskontroll-Policy
>
> *„1. HR meldet Austritt an IT-Helpdesk (mind. 3 Tage vorher). 2. IT deaktiviert AD-Konto am letzten Arbeitstag um 17:00 Uhr. 3. E-Mail-Weiterleitung für 30 Tage an Vorgesetzten einrichten. 4. Alle SaaS-Zugänge (Liste Anhang A) innerhalb 24h deaktivieren. 5. Laptop einsammeln, Festplatte sicher löschen (Zertifikat ablegen). 6. Abschluss-Checkliste ausfüllen und in Personalakte ablegen."*

Das ist eine **Procedure**: eine konkrete Handlungsanweisung, die jeder IT-Mitarbeiter ohne Vorkenntnisse ausführen kann.

---

## Procedure im ISMS Builder

**Anlegen:** Sidebar → Procedure → Neues Dokument
**Lifecycle:** Entwurf → Prüfung → Freigegeben → Archiviert
**Verknüpfen:**
- mit der übergeordneten Policy (→ „Verknüpfte Richtlinien")
- mit ISO-Controls (z.B. A.5.18 Zugriffsrechte)
- mit Risiken die durch diese Procedure behandelt werden

### Typische Dokumentstruktur einer Procedure

```
1. Zweck und Geltungsbereich
2. Bezug zu Richtlinien / Normen
3. Rollen und Verantwortlichkeiten (Wer macht was?)
4. Ablaufbeschreibung (nummerierte Schritte)
5. Ausnahmen und Eskalationspfade
6. Nachweise und Dokumentation
7. Anhänge (Formulare, Checklisten, Screenshots)
```

---

## Abgrenzung Policy vs. Procedure — an einem Beispiel

**Szenario:** Mitarbeiter verlässt das Unternehmen.

| | Policy (Zugriffskontroll-Richtlinie) | Procedure (Offboarding-Verfahren) |
|---|---|---|
| **Aussage** | „Zugriffsrechte ausgeschiedener Mitarbeiter müssen unverzüglich entzogen werden." | „1. HR meldet Austritt an IT. 2. AD-Konto deaktivieren. 3. SaaS-Zugänge sperren…" |
| **Wer schreibt es?** | CISO / Geschäftsführung | IT-Leitung |
| **Für wen?** | Alle (Grundsatz) | IT-Helpdesk (Ausführende) |
| **Audit-Frage** | „Haben Sie eine Policy?" | „Wie haben Sie es im letzten Fall gemacht?" |

---

## Audit-Nachweis

Ein Auditor prüft nach ISO 27001 A.5.18 ob Zugriffsrechte ordnungsgemäß verwaltet werden.
→ Du zeigst die **Policy** als Grundsatzdokument.
→ Du zeigst die **Procedure** als Beweis dass es einen gelebten Prozess gibt.
→ Du zeigst den **Audit-Log** im ISMS Builder als Beweis dass es auch wirklich gemacht wurde.
