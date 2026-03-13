# Risk Policy vs. Risk Register — Zwei Konzepte, ein Ziel

> **Für wen ist dieses Dokument?**
> Für alle, die im ISMS Builder mit Risiken arbeiten — insbesondere CISOs, Informationssicherheitsbeauftragte und Auditoren.
> Es erklärt anhand konkreter Beispiele, wann man was benutzt und wie beides zusammenwirkt.

---

## Das Grundproblem: „Risk" bedeutet zwei verschiedene Dinge

In einem ISMS begegnet dir das Wort „Risiko" in zwei völlig unterschiedlichen Kontexten:

1. Du schreibst eine **Richtlinie**, die beschreibt *wie* deine Organisation mit Risiken umgeht.
2. Du trägst ein **konkretes Risiko** ein, das heute in deiner IT-Landschaft existiert.

Das ist der Unterschied zwischen dem **Regelwerk** und der **Realität** — beides ist notwendig, beides gehört zusammen, aber es sind unterschiedliche Werkzeuge.

---

## Konzept 1: Risk Policy (Richtliniendokument)

**Was ist das?**
Ein schriftliches Dokument — ähnlich einer Word-Datei oder einem PDF — das die *Spielregeln* deines Risikomanagements beschreibt. Es beantwortet Fragen wie:

- Wie definiert unsere Organisation ein Risiko?
- Wer ist für die Risikobeurteilung zuständig?
- Welche Risikostufen gibt es (niedrig / mittel / hoch / kritisch)?
- Wie oft werden Risiken reviewed?
- Was ist unsere Risikoakzeptanzgrenze?

**Wo findet man es im ISMS Builder?**
In der linken Sidebar unter den Template-Typen → **Risk Policy**. Diese Dokumente werden versioniert, durchlaufen einen Freigabe-Workflow (Entwurf → Prüfung → Freigegeben) und sind an ISO-27001-Controls verknüpfbar.

**Konkretes Beispiel:**

> **Dokument:** „Risikomanagementsrichtlinie v2.3 — Alpha GmbH"
>
> Inhalt: *„Risiken werden mindestens jährlich bewertet. Die Risikomatrix verwendet eine 5×5-Skala. Risiken mit einem Score ≥ 15 erfordern die Genehmigung des Vorstands. Verantwortlich für den Prozess ist der CISO. Grundlage ist ISO 27001:2022 Kapitel 6.1.2."*

Das ist ein **Dokument**, das in einem Audit vorgelegt wird. Es beschreibt den Prozess, nicht die Daten.

---

## Konzept 2: Risk Register (Risikoregistereintrag)

**Was ist das?**
Ein strukturierter **Datensatz** — vergleichbar mit einer Zeile in einer Datenbank — der ein real existierendes Risiko beschreibt. Es beantwortet Fragen wie:

- Welche konkrete Bedrohung existiert gerade?
- Wie wahrscheinlich ist ein Eintritt?
- Welchen Schaden würde es anrichten?
- Was tun wir dagegen (Maßnahmenplan)?
- Wer ist verantwortlich?

**Wo findet man es im ISMS Builder?**
In der oberen Navigation unter **Risks**. Jeder Eintrag hat einen Score, einen Status, Behandlungsmaßnahmen und kann mit CVSS-Daten aus Schwachstellenscannern angereichert werden.

**Konkretes Beispiel:**

> **Risikoeintrag:** „Ransomware-Angriff auf Produktionssysteme"
>
> Wahrscheinlichkeit: 4/5 · Impact: 5/5 · Score: 20 · Status: in Behandlung
> Maßnahme: Offline-Backup einführen bis 2026-06-30
> Verknüpft mit: ISO 27001 A.8.13 (Backup), A.5.30 (BCM)
> CVSS: 9.8 (Critical) — CVE-2024-1234

Das ist ein **lebender Datensatz**, der laufend aktualisiert wird. Er taucht in Reports, auf dem Dashboard und in der Freigabe-Queue auf.

---

## Wie hängen beide zusammen?

Die **Risk Policy** ist die Verfassung — sie legt die Regeln fest.
Das **Risk Register** ist die Umsetzung — es wendet die Regeln an.

```
Risk Policy (Richtlinie)
  └── definiert: Bewertungsskala, Akzeptanzschwelle, Review-Zyklus
         │
         ▼
Risk Register (Einzelrisiken)
  ├── Ransomware-Angriff         Score: 20  → kritisch (laut Policy: Vorstand!)
  ├── Phishing-Kampagne          Score: 12  → hoch
  ├── Ausfall Cloud-Provider     Score:  9  → mittel
  └── Veraltete Bibliothek (npm) Score:  4  → niedrig
```

Im ISMS Builder kannst du jeden Risk-Register-Eintrag mit der Risk Policy **verknüpfen** (Feld „Verknüpfte Richtlinien"). Ein Auditor sieht dann auf einen Blick: das Risiko existiert (Register) und es wird nach definierten Regeln behandelt (Policy).

---

## Praktischer Workflow: Von der Richtlinie zum Risiko

**Schritt 1 — Richtlinie schreiben**
Navigiere in der Sidebar zu **Risk Policy** → Neues Dokument anlegen.
Beschreibe den Prozess: Bewertungsmethodik, Verantwortlichkeiten, Review-Zyklen.
Lifecycle: Entwurf → Prüfung (Auditor) → Freigegeben.

**Schritt 2 — Risiken erfassen**
Navigiere zu **Risks** in der oberen Navigation → Neues Risiko.
Fülle Titel, Kategorie, Wahrscheinlichkeit, Impact aus.
Verknüpfe das Risiko mit der freigegebenen Risk Policy unter „Verknüpfte Richtlinien".

**Schritt 3 — Scan-Import nutzen (optional)**
Greenbone/OpenVAS-Ergebnisse (XML oder PDF) über Admin → Wartung → Scan-Import hochladen.
Die gescannten Schwachstellen werden als Risikoeinträge mit CVSS-Score importiert und landen in der Freigabe-Queue.
Ein Auditor prüft und gibt sie frei — erst dann erscheinen sie im normalen Risk-Register.

**Schritt 4 — Behandlungsmaßnahmen**
Für jedes Risiko im Register: Behandlungsplan anlegen (Maßnahme, Fälligkeitsdatum, Verantwortlicher).
Der Status wechselt von „offen" zu „in Behandlung" zu „geschlossen".

**Schritt 5 — Review**
Das Dashboard zeigt überfällige Reviews. Die Risk Policy legt fest wie oft — das Register zeigt wann zuletzt geprüft wurde.
Ein Auditor kann den gesamten Zyklus im **Reports → Risk Register** nachvollziehen.

---

## Vier typische Szenarien

### Szenario A: Internes Audit
Der Auditor fragt: „Haben Sie ein dokumentiertes Risikomanagement?"
→ Antwort: Risk Policy vorlegen (Richtliniendokument, freigegeben, versioniert).
→ Nachweis: Risk Register zeigen (lebende Daten, mit Behandlungsmaßnahmen).

### Szenario B: Schwachstellen-Scan
Greenbone findet 12 kritische CVEs im Netzwerk.
→ XML-Export aus Greenbone → Import in ISMS Builder (Admin → Scan-Import).
→ 12 Risikoeinträge entstehen mit CVSS-Scores, warten auf Auditor-Freigabe.
→ Freigegebene Risiken erscheinen im Register und im Dashboard-Alert.

### Szenario C: Neuer ISO-27001-Auditor
Er möchte sehen, ob Risiken mit Controls verknüpft sind.
→ Risk Register: jeder Eintrag zeigt „Verknüpfte Controls" (z.B. ISO A.8.8).
→ SoA: jedes Control zeigt umgekehrt welche Risiken darauf verweisen.
→ Reports → Compliance: Implementierungsrate pro Framework + Gesellschaft.

### Szenario D: Vorstandspräsentation
Der Vorstand will einen Überblick über die Top-Risiken.
→ Reports → Risk Register als PDF exportieren (Drucken-Button).
→ Dashboard: Top-5-Risiken nach Score, mit Ampelfarben.

---

## Zusammenfassung

| | Risk Policy | Risk Register |
|---|---|---|
| **Was** | Richtliniendokument | Datensatz / Eintrag |
| **Zweck** | Prozess definieren | Realität abbilden |
| **Lebenszyklus** | Entwurf → Freigegeben → Archiviert | Offen → In Behandlung → Geschlossen |
| **Wo im ISMS Builder** | Sidebar → Risk Policy | Navigation → Risks |
| **Audit-Nachweis** | „So arbeiten wir" | „Das haben wir gefunden und behandelt" |
| **Verknüpfung** | Mit ISO-Controls, anderen Policies | Mit Risk Policy, ISO-Controls, Gesellschaften |
| **Export** | PDF-Druck über Guidance | Reports → Risk Register → PDF/CSV |

Beides zusammen ergibt ein vollständiges, auditierbares Risikomanagement nach ISO 27001.
