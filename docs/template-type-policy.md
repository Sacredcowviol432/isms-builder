# Template-Typ: Policy (Richtlinie)

> **Kurzdefinition:** Eine Policy ist eine verbindliche Leitaussage der Unternehmensführung — sie beschreibt *was* gewollt ist und *warum*, nicht wie es umgesetzt wird.

---

## Was ist eine Policy?

Eine Policy ist das höchste Regelwerk in der Dokumentenhierarchie eines ISMS. Sie wird von der Geschäftsführung oder dem CISO verabschiedet und gibt die Richtung vor. Mitarbeiter und Systeme müssen sich daran halten — die konkreten Umsetzungsschritte folgen in einem separaten Dokument (→ Procedure).

**Typische Merkmale:**
- Kurz und prägnant (1–5 Seiten)
- Sprachlich verbindlich: „muss", „ist verboten", „ist sicherzustellen"
- Gilt für eine definierte Zielgruppe (z.B. alle Mitarbeiter, alle IT-Systeme)
- Hat eine benannte verantwortliche Person (Policy Owner)
- Wird regelmäßig reviewed (typisch: jährlich)

---

## Typische Policies im ISMS

| Policy | Inhalt (Beispiel) |
|--------|-------------------|
| **Informationssicherheitsrichtlinie** | Grundsatzerklärung der Geschäftsführung zur IS; Schutzziele CIA; Geltungsbereich |
| **Passwort-Policy** | Mindestlänge, Komplexität, Wiederverwendungsverbot, MFA-Pflicht |
| **Acceptable Use Policy** | Erlaubte Nutzung von IT-Ressourcen, Privatnutzung, Social Media |
| **BYOD-Richtlinie** | Private Geräte im Firmennetz: Anforderungen, MDM, Datentrennung |
| **Clean Desk Policy** | Umgang mit Unterlagen, Bildschirmsperre, Druckerregeln |
| **Backup-Policy** | Was wird gesichert, wie oft, wie lange aufbewahrt, wer ist verantwortlich |
| **Verschlüsselungs-Policy** | Pflicht zur Verschlüsselung bei Transport und Speicherung, zugelassene Algorithmen |
| **Remote Work Policy** | VPN-Pflicht, Heimnetz-Anforderungen, Verbotene Tätigkeiten |

---

## Konkretes Beispiel

> **Dokument:** „Passwort-Policy v1.4 — Alpha GmbH"
> **Status:** Freigegeben · **Owner:** CISO · **Review:** 2027-03-01
>
> *„Alle Benutzerpasswörter müssen mindestens 12 Zeichen lang sein und Groß- und Kleinbuchstaben, Ziffern sowie Sonderzeichen enthalten. Die Wiederverwendung der letzten 12 Passwörter ist verboten. Für alle privilegierten Konten ist Multi-Faktor-Authentifizierung verpflichtend. Passwörter dürfen nicht aufgeschrieben oder per E-Mail übertragen werden. Verstöße werden disziplinarisch geahndet."*

Das ist eine **Policy**: eine klare Ansage, was gilt. Kein „wie": dafür gibt es die Procedure „Passwort-Verwaltung" (→ Template-Typ Procedure).

---

## Policy im ISMS Builder

**Anlegen:** Sidebar → Policy → Neues Dokument
**Lifecycle:** Entwurf → Prüfung (Auditor) → Freigegeben → Archiviert
**Verknüpfen:** mit ISO-27001-Controls (z.B. A.5.17 Authentifizierungsinformationen)
**Review:** `nextReviewDate`-Feld — Dashboard warnt bei Überfälligkeit

### Zusammenspiel mit anderen Typen

```
Informationssicherheitsrichtlinie  (Policy)
  ├── Passwort-Policy               (Policy)
  │     └── Passwort-Verwaltung     (Procedure) ← Wie setzt man es um?
  ├── BYOD-Richtlinie               (Policy)
  │     └── BYOD-Onboarding         (Procedure)
  └── Backup-Policy                 (Policy)
        └── Backup-Durchführung     (Procedure)
```

**Audit-Nachweis:** Eine freigegebene, versionierte Policy mit nachweisbarem Review-Zyklus erfüllt ISO 27001 Kapitel 5.2 (Informationssicherheitspolitik).

---

## Abgrenzung zu anderen Template-Typen

| Frage | Policy | Procedure |
|-------|--------|-----------|
| Was wollen wir erreichen? | ✓ | — |
| Warum ist das wichtig? | ✓ | — |
| Wie genau wird es umgesetzt? | — | ✓ |
| Schritt-für-Schritt-Anleitung? | — | ✓ |
| Von der Geschäftsführung verabschiedet? | ✓ | optional |
| Länge | 1–5 Seiten | 3–20 Seiten |
