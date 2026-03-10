// © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0
// SoA Store – Statement of Applicability
// Multi-Framework: ISO 27001:2022 · BSI IT-Grundschutz · EU NIS2 · EUCS · EU AI Act
// Persistenz: data/soa.json
// Control-IDs sind framework-präfixiert (z.B. ISO-5.1, BSI-ISMS.1, NIS2-a, EUCS-1, EUAI-9)
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(DATA_DIR, 'soa.json')

const IMPLEMENTATION_STATUSES = ['not_started', 'partial', 'implemented', 'optimized']

const FRAMEWORKS = {
  ISO27001: { id: 'ISO27001', label: 'ISO 27001:2022',      color: '#4f8cff' },
  BSI:      { id: 'BSI',      label: 'BSI IT-Grundschutz',  color: '#f0b429' },
  NIS2:     { id: 'NIS2',     label: 'EU NIS2',             color: '#34d399' },
  EUCS:     { id: 'EUCS',     label: 'EU Cloud (EUCS)',     color: '#a78bfa' },
  EUAI:     { id: 'EUAI',     label: 'EU AI Act',           color: '#fb923c' },
  ISO9000:  { id: 'ISO9000',  label: 'ISO 9000:2015',       color: '#2dd4bf' },
  ISO9001:  { id: 'ISO9001',  label: 'ISO 9001:2015',       color: '#f472b6' },
  CRA:      { id: 'CRA',      label: 'EU Cyber Resilience Act', color: '#e11d48' },
}

// ─────────────────────────────────────────────────────────────────
// ISO 27001:2022 – Annex A (93 Controls)
// ─────────────────────────────────────────────────────────────────
const ISO27001_CONTROLS = [
  // Organizational (5.1–5.37)
  { id:'ISO-5.1',  theme:'Organizational', title:'Policies for information security' },
  { id:'ISO-5.2',  theme:'Organizational', title:'Information security roles and responsibilities' },
  { id:'ISO-5.3',  theme:'Organizational', title:'Segregation of duties' },
  { id:'ISO-5.4',  theme:'Organizational', title:'Management responsibilities' },
  { id:'ISO-5.5',  theme:'Organizational', title:'Contact with authorities' },
  { id:'ISO-5.6',  theme:'Organizational', title:'Contact with special interest groups' },
  { id:'ISO-5.7',  theme:'Organizational', title:'Threat intelligence' },
  { id:'ISO-5.8',  theme:'Organizational', title:'Information security in project management' },
  { id:'ISO-5.9',  theme:'Organizational', title:'Inventory of information and other associated assets' },
  { id:'ISO-5.10', theme:'Organizational', title:'Acceptable use of information and other associated assets' },
  { id:'ISO-5.11', theme:'Organizational', title:'Return of assets' },
  { id:'ISO-5.12', theme:'Organizational', title:'Classification of information' },
  { id:'ISO-5.13', theme:'Organizational', title:'Labelling of information' },
  { id:'ISO-5.14', theme:'Organizational', title:'Information transfer' },
  { id:'ISO-5.15', theme:'Organizational', title:'Access control' },
  { id:'ISO-5.16', theme:'Organizational', title:'Identity management' },
  { id:'ISO-5.17', theme:'Organizational', title:'Authentication information' },
  { id:'ISO-5.18', theme:'Organizational', title:'Access rights' },
  { id:'ISO-5.19', theme:'Organizational', title:'Information security in supplier relationships' },
  { id:'ISO-5.20', theme:'Organizational', title:'Addressing information security within supplier agreements' },
  { id:'ISO-5.21', theme:'Organizational', title:'Managing information security in the ICT supply chain' },
  { id:'ISO-5.22', theme:'Organizational', title:'Monitoring, review and change management of supplier services' },
  { id:'ISO-5.23', theme:'Organizational', title:'Information security for use of cloud services' },
  { id:'ISO-5.24', theme:'Organizational', title:'Information security incident management planning and preparation' },
  { id:'ISO-5.25', theme:'Organizational', title:'Assessment and decision on information security events' },
  { id:'ISO-5.26', theme:'Organizational', title:'Response to information security incidents' },
  { id:'ISO-5.27', theme:'Organizational', title:'Learning from information security incidents' },
  { id:'ISO-5.28', theme:'Organizational', title:'Collection of evidence' },
  { id:'ISO-5.29', theme:'Organizational', title:'Information security during disruption' },
  { id:'ISO-5.30', theme:'Organizational', title:'ICT readiness for business continuity' },
  { id:'ISO-5.31', theme:'Organizational', title:'Legal, statutory, regulatory and contractual requirements' },
  { id:'ISO-5.32', theme:'Organizational', title:'Intellectual property rights' },
  { id:'ISO-5.33', theme:'Organizational', title:'Protection of records' },
  { id:'ISO-5.34', theme:'Organizational', title:'Privacy and protection of personally identifiable information' },
  { id:'ISO-5.35', theme:'Organizational', title:'Independent review of information security' },
  { id:'ISO-5.36', theme:'Organizational', title:'Compliance with policies, rules and standards for information security' },
  { id:'ISO-5.37', theme:'Organizational', title:'Documented operating procedures' },
  // People (6.1–6.8)
  { id:'ISO-6.1', theme:'People', title:'Screening' },
  { id:'ISO-6.2', theme:'People', title:'Terms and conditions of employment' },
  { id:'ISO-6.3', theme:'People', title:'Information security awareness, education and training' },
  { id:'ISO-6.4', theme:'People', title:'Disciplinary process' },
  { id:'ISO-6.5', theme:'People', title:'Responsibilities after termination or change of employment' },
  { id:'ISO-6.6', theme:'People', title:'Confidentiality or non-disclosure agreements' },
  { id:'ISO-6.7', theme:'People', title:'Remote working' },
  { id:'ISO-6.8', theme:'People', title:'Information security event reporting' },
  // Physical (7.1–7.14)
  { id:'ISO-7.1',  theme:'Physical', title:'Physical security perimeters' },
  { id:'ISO-7.2',  theme:'Physical', title:'Physical entry' },
  { id:'ISO-7.3',  theme:'Physical', title:'Securing offices, rooms and facilities' },
  { id:'ISO-7.4',  theme:'Physical', title:'Physical security monitoring' },
  { id:'ISO-7.5',  theme:'Physical', title:'Protecting against physical and environmental threats' },
  { id:'ISO-7.6',  theme:'Physical', title:'Working in secure areas' },
  { id:'ISO-7.7',  theme:'Physical', title:'Clear desk and clear screen' },
  { id:'ISO-7.8',  theme:'Physical', title:'Equipment siting and protection' },
  { id:'ISO-7.9',  theme:'Physical', title:'Security of assets off-premises' },
  { id:'ISO-7.10', theme:'Physical', title:'Storage media' },
  { id:'ISO-7.11', theme:'Physical', title:'Supporting utilities' },
  { id:'ISO-7.12', theme:'Physical', title:'Cabling security' },
  { id:'ISO-7.13', theme:'Physical', title:'Equipment maintenance' },
  { id:'ISO-7.14', theme:'Physical', title:'Secure disposal or re-use of equipment' },
  // Technological (8.1–8.34)
  { id:'ISO-8.1',  theme:'Technological', title:'User endpoint devices' },
  { id:'ISO-8.2',  theme:'Technological', title:'Privileged access rights' },
  { id:'ISO-8.3',  theme:'Technological', title:'Information access restriction' },
  { id:'ISO-8.4',  theme:'Technological', title:'Access to source code' },
  { id:'ISO-8.5',  theme:'Technological', title:'Secure authentication' },
  { id:'ISO-8.6',  theme:'Technological', title:'Capacity management' },
  { id:'ISO-8.7',  theme:'Technological', title:'Protection against malware' },
  { id:'ISO-8.8',  theme:'Technological', title:'Management of technical vulnerabilities' },
  { id:'ISO-8.9',  theme:'Technological', title:'Configuration management' },
  { id:'ISO-8.10', theme:'Technological', title:'Information deletion' },
  { id:'ISO-8.11', theme:'Technological', title:'Data masking' },
  { id:'ISO-8.12', theme:'Technological', title:'Data leakage prevention' },
  { id:'ISO-8.13', theme:'Technological', title:'Information backup' },
  { id:'ISO-8.14', theme:'Technological', title:'Redundancy of information processing facilities' },
  { id:'ISO-8.15', theme:'Technological', title:'Logging' },
  { id:'ISO-8.16', theme:'Technological', title:'Monitoring activities' },
  { id:'ISO-8.17', theme:'Technological', title:'Clock synchronization' },
  { id:'ISO-8.18', theme:'Technological', title:'Use of privileged utility programs' },
  { id:'ISO-8.19', theme:'Technological', title:'Installation of software on operational systems' },
  { id:'ISO-8.20', theme:'Technological', title:'Networks security' },
  { id:'ISO-8.21', theme:'Technological', title:'Security of network services' },
  { id:'ISO-8.22', theme:'Technological', title:'Segregation of networks' },
  { id:'ISO-8.23', theme:'Technological', title:'Web filtering' },
  { id:'ISO-8.24', theme:'Technological', title:'Use of cryptography' },
  { id:'ISO-8.25', theme:'Technological', title:'Secure development life cycle' },
  { id:'ISO-8.26', theme:'Technological', title:'Application security requirements' },
  { id:'ISO-8.27', theme:'Technological', title:'Secure system architecture and engineering principles' },
  { id:'ISO-8.28', theme:'Technological', title:'Secure coding' },
  { id:'ISO-8.29', theme:'Technological', title:'Security testing in development and acceptance' },
  { id:'ISO-8.30', theme:'Technological', title:'Outsourced development' },
  { id:'ISO-8.31', theme:'Technological', title:'Separation of development, test and production environments' },
  { id:'ISO-8.32', theme:'Technological', title:'Change management' },
  { id:'ISO-8.33', theme:'Technological', title:'Test information' },
  { id:'ISO-8.34', theme:'Technological', title:'Protection of information systems during audit testing' },
].map(c => ({ ...c, framework: 'ISO27001' }))

// ─────────────────────────────────────────────────────────────────
// BSI IT-Grundschutz – Kern-Bausteine
// ─────────────────────────────────────────────────────────────────
const BSI_CONTROLS = [
  // ISMS
  { id:'BSI-ISMS.1', theme:'ISMS',          title:'Sicherheitsmanagement' },
  // ORP – Organisation und Personal
  { id:'BSI-ORP.1',  theme:'Organisation',  title:'Organisation' },
  { id:'BSI-ORP.2',  theme:'Organisation',  title:'Personal' },
  { id:'BSI-ORP.3',  theme:'Organisation',  title:'Sensibilisierung und Schulung zur Informationssicherheit' },
  { id:'BSI-ORP.4',  theme:'Organisation',  title:'Identitäts- und Berechtigungsmanagement' },
  { id:'BSI-ORP.5',  theme:'Organisation',  title:'Compliance Management (Anforderungsmanagement)' },
  // CON – Konzepte und Vorgehensweisen
  { id:'BSI-CON.1',  theme:'Konzepte',      title:'Kryptokonzept' },
  { id:'BSI-CON.2',  theme:'Konzepte',      title:'Datenschutz' },
  { id:'BSI-CON.3',  theme:'Konzepte',      title:'Datensicherungskonzept' },
  { id:'BSI-CON.6',  theme:'Konzepte',      title:'Löschen und Vernichten' },
  { id:'BSI-CON.7',  theme:'Konzepte',      title:'Informationssicherheit auf Auslandsreisen' },
  { id:'BSI-CON.8',  theme:'Konzepte',      title:'Software-Entwicklung' },
  { id:'BSI-CON.9',  theme:'Konzepte',      title:'Informationsaustausch' },
  { id:'BSI-CON.10', theme:'Konzepte',      title:'Entwicklung von Webanwendungen' },
  // OPS – Betrieb
  { id:'BSI-OPS.1.1.1', theme:'Betrieb',   title:'Allgemeiner IT-Betrieb' },
  { id:'BSI-OPS.1.1.2', theme:'Betrieb',   title:'Ordnungsgemäße IT-Administration' },
  { id:'BSI-OPS.1.1.3', theme:'Betrieb',   title:'Patch- und Änderungsmanagement' },
  { id:'BSI-OPS.1.1.4', theme:'Betrieb',   title:'Schutz vor Schadprogrammen' },
  { id:'BSI-OPS.1.1.5', theme:'Betrieb',   title:'Protokollierung' },
  { id:'BSI-OPS.1.1.6', theme:'Betrieb',   title:'Software-Tests und Freigaben' },
  { id:'BSI-OPS.1.2.2', theme:'Betrieb',   title:'Archivierung' },
  { id:'BSI-OPS.1.2.4', theme:'Betrieb',   title:'Telearbeit' },
  { id:'BSI-OPS.1.2.5', theme:'Betrieb',   title:'Fernwartung' },
  { id:'BSI-OPS.2.1',   theme:'Betrieb',   title:'Outsourcing für Kunden' },
  { id:'BSI-OPS.2.2',   theme:'Betrieb',   title:'Cloud-Nutzung' },
  { id:'BSI-OPS.2.3',   theme:'Betrieb',   title:'Nutzung von Outsourcing' },
  // DER – Detektion und Reaktion
  { id:'BSI-DER.1',   theme:'Detektion',   title:'Detektion von sicherheitsrelevanten Ereignissen' },
  { id:'BSI-DER.2.1', theme:'Detektion',   title:'Behandlung von Sicherheitsvorfällen' },
  { id:'BSI-DER.2.2', theme:'Detektion',   title:'Vorsorge für die IT-Forensik' },
  { id:'BSI-DER.2.3', theme:'Detektion',   title:'Bereinigung weitreichender Sicherheitsvorfälle' },
  { id:'BSI-DER.3.1', theme:'Detektion',   title:'Audits und Revisionen' },
  { id:'BSI-DER.4',   theme:'Detektion',   title:'Notfallmanagement' },
  // APP – Anwendungen
  { id:'BSI-APP.1.1', theme:'Anwendungen', title:'Office-Produkte' },
  { id:'BSI-APP.1.2', theme:'Anwendungen', title:'Webbrowser' },
  { id:'BSI-APP.2.1', theme:'Anwendungen', title:'Allgemeiner Verzeichnisdienst' },
  { id:'BSI-APP.3.1', theme:'Anwendungen', title:'Webanwendungen und Webservices' },
  { id:'BSI-APP.3.2', theme:'Anwendungen', title:'Webserver' },
  { id:'BSI-APP.3.3', theme:'Anwendungen', title:'Fileserver' },
  { id:'BSI-APP.4.3', theme:'Anwendungen', title:'Relationale Datenbanken' },
  { id:'BSI-APP.4.4', theme:'Anwendungen', title:'Kubernetes' },
  { id:'BSI-APP.5.3', theme:'Anwendungen', title:'Allgemeiner E-Mail-Client und -Server' },
  { id:'BSI-APP.6',   theme:'Anwendungen', title:'Allgemeine Software' },
  { id:'BSI-APP.7',   theme:'Anwendungen', title:'Entwicklung von Individualsoftware' },
  // SYS – IT-Systeme
  { id:'BSI-SYS.1.1', theme:'IT-Systeme',  title:'Allgemeiner Server' },
  { id:'BSI-SYS.1.3', theme:'IT-Systeme',  title:'Server unter Linux und Unix' },
  { id:'BSI-SYS.1.5', theme:'IT-Systeme',  title:'Virtualisierung' },
  { id:'BSI-SYS.1.6', theme:'IT-Systeme',  title:'Containerisierung' },
  { id:'BSI-SYS.1.8', theme:'IT-Systeme',  title:'Speicherlösungen' },
  { id:'BSI-SYS.2.1', theme:'IT-Systeme',  title:'Allgemeiner Client' },
  { id:'BSI-SYS.2.2', theme:'IT-Systeme',  title:'Clients unter Windows' },
  { id:'BSI-SYS.2.3', theme:'IT-Systeme',  title:'Clients unter Linux und Unix' },
  { id:'BSI-SYS.3.1', theme:'IT-Systeme',  title:'Laptops' },
  { id:'BSI-SYS.3.2', theme:'IT-Systeme',  title:'Allgemeines Smartphone und Tablet' },
  { id:'BSI-SYS.4.5', theme:'IT-Systeme',  title:'Wechseldatenträger' },
  // NET – Netze und Kommunikation
  { id:'BSI-NET.1.1', theme:'Netze',        title:'Netzarchitektur und -design' },
  { id:'BSI-NET.1.2', theme:'Netze',        title:'Netzmanagement' },
  { id:'BSI-NET.2.1', theme:'Netze',        title:'WLAN-Betrieb' },
  { id:'BSI-NET.3.1', theme:'Netze',        title:'Router und Switches' },
  { id:'BSI-NET.3.2', theme:'Netze',        title:'Firewall' },
  { id:'BSI-NET.3.3', theme:'Netze',        title:'VPN' },
  // INF – Infrastruktur
  { id:'BSI-INF.1',   theme:'Infrastruktur', title:'Allgemeines Gebäude' },
  { id:'BSI-INF.2',   theme:'Infrastruktur', title:'Rechenzentrum sowie Serverraum' },
  { id:'BSI-INF.7',   theme:'Infrastruktur', title:'Büroarbeitsplatz' },
  { id:'BSI-INF.8',   theme:'Infrastruktur', title:'Häuslicher Arbeitsplatz' },
  { id:'BSI-INF.9',   theme:'Infrastruktur', title:'Mobiler Arbeitsplatz' },
  { id:'BSI-INF.12',  theme:'Infrastruktur', title:'Verkabelung' },
].map(c => ({ ...c, framework: 'BSI' }))

// ─────────────────────────────────────────────────────────────────
// EU NIS2 – Richtlinie 2022/2555, Art. 21 Maßnahmen
// ─────────────────────────────────────────────────────────────────
const NIS2_CONTROLS = [
  { id:'NIS2-a', theme:'Risikomanagement',    title:'Art. 21(2)(a) – Konzepte für Risikoanalyse und Sicherheit der Informationssysteme' },
  { id:'NIS2-b', theme:'Vorfallmanagement',   title:'Art. 21(2)(b) – Bewältigung von Sicherheitsvorfällen (Incident Handling)' },
  { id:'NIS2-c', theme:'Betriebskontinuität', title:'Art. 21(2)(c) – Aufrechterhaltung des Betriebs, Backup, Notfallwiederherstellung, Krisenmanagement' },
  { id:'NIS2-d', theme:'Lieferkette',         title:'Art. 21(2)(d) – Sicherheit der Lieferkette (Supplier & Service Provider)' },
  { id:'NIS2-e', theme:'Entwicklung',         title:'Art. 21(2)(e) – Sicherheit beim Erwerb, Entwicklung und Wartung von Netz- und Informationssystemen, Schwachstellenmanagement' },
  { id:'NIS2-f', theme:'Wirksamkeit',         title:'Art. 21(2)(f) – Konzepte und Verfahren zur Bewertung der Wirksamkeit von Risikomanagementmaßnahmen' },
  { id:'NIS2-g', theme:'Schulung',            title:'Art. 21(2)(g) – Grundlegende Cyberhygiene und Cybersicherheitsschulungen' },
  { id:'NIS2-h', theme:'Kryptografie',        title:'Art. 21(2)(h) – Konzepte und Verfahren für den Einsatz von Kryptografie und Verschlüsselung' },
  { id:'NIS2-i', theme:'Personal',            title:'Art. 21(2)(i) – Personalsicherheit, Konzepte für Zugriffskontrolle und Asset-Management' },
  { id:'NIS2-j', theme:'Authentisierung',     title:'Art. 21(2)(j) – Multi-Faktor-Authentifizierung, gesicherte Kommunikation und Notfallkommunikation' },
].map(c => ({ ...c, framework: 'NIS2' }))

// ─────────────────────────────────────────────────────────────────
// EUCS – EU Cybersecurity Certification Scheme for Cloud Services
// ─────────────────────────────────────────────────────────────────
const EUCS_CONTROLS = [
  { id:'EUCS-GOV.1',  theme:'Governance',         title:'Sicherheitsrichtlinien und Governance-Framework' },
  { id:'EUCS-GOV.2',  theme:'Governance',         title:'Rollen und Verantwortlichkeiten für Informationssicherheit' },
  { id:'EUCS-GOV.3',  theme:'Governance',         title:'Risikomanagement und Risikobewertung' },
  { id:'EUCS-IAM.1',  theme:'Identität & Zugriff', title:'Identitäts- und Zugriffsmanagement' },
  { id:'EUCS-IAM.2',  theme:'Identität & Zugriff', title:'Multi-Faktor-Authentifizierung' },
  { id:'EUCS-IAM.3',  theme:'Identität & Zugriff', title:'Privilegierter Zugriff und Least Privilege' },
  { id:'EUCS-SCM.1',  theme:'Lieferkette',         title:'Lieferkettensicherheit und Abhängigkeitsmanagement' },
  { id:'EUCS-SCM.2',  theme:'Lieferkette',         title:'Sub-Prozessor-Management und Vertragsklauseln' },
  { id:'EUCS-CHM.1',  theme:'Änderungsmanagement', title:'Change Management und Konfigurationskontrolle' },
  { id:'EUCS-CHM.2',  theme:'Änderungsmanagement', title:'Software-Sicherheitstest vor Deployment' },
  { id:'EUCS-BCM.1',  theme:'Betriebskontinuität', title:'Business Continuity und Disaster Recovery' },
  { id:'EUCS-BCM.2',  theme:'Betriebskontinuität', title:'Backup und Wiederherstellbarkeit' },
  { id:'EUCS-INC.1',  theme:'Vorfallmanagement',   title:'Incident Detection und Monitoring' },
  { id:'EUCS-INC.2',  theme:'Vorfallmanagement',   title:'Incident Response und Meldepflichten' },
  { id:'EUCS-CRY.1',  theme:'Kryptografie',        title:'Kryptografie und Schlüsselmanagement' },
  { id:'EUCS-VUL.1',  theme:'Schwachstellen',      title:'Schwachstellenmanagement und Penetrationstests' },
  { id:'EUCS-VUL.2',  theme:'Schwachstellen',      title:'Patch-Management' },
  { id:'EUCS-LOG.1',  theme:'Logging & Monitoring', title:'Logging, Monitoring und Audit-Trails' },
  { id:'EUCS-NET.1',  theme:'Netzwerk',            title:'Netzwerksicherheit und Segmentierung' },
  { id:'EUCS-PHY.1',  theme:'Physisch',            title:'Physische Sicherheit der Rechenzentren' },
  { id:'EUCS-DPR.1',  theme:'Datenschutz',         title:'Datenschutz und Datenklassifizierung' },
  { id:'EUCS-DPR.2',  theme:'Datenschutz',         title:'Datenlöschung und -portabilität' },
  { id:'EUCS-PEN.1',  theme:'Personal',            title:'Mitarbeitersicherheit und Hintergrundprüfungen' },
].map(c => ({ ...c, framework: 'EUCS' }))

// ─────────────────────────────────────────────────────────────────
// EU AI Act – Verordnung 2024/1689
// Anforderungen für Hochrisiko-KI-Systeme (Titel III, Kapitel 2)
// sowie GPAI-Pflichten (Titel VIII)
// ─────────────────────────────────────────────────────────────────
const EUAI_CONTROLS = [
  // Hochrisiko-KI (Art. 8–15)
  { id:'EUAI-ART9',    theme:'Hochrisiko-KI',  title:'Art. 9 – Risikomanagementsystem für KI-Systeme' },
  { id:'EUAI-ART10',   theme:'Hochrisiko-KI',  title:'Art. 10 – Anforderungen an Daten und Daten-Governance' },
  { id:'EUAI-ART11',   theme:'Hochrisiko-KI',  title:'Art. 11 – Technische Dokumentation' },
  { id:'EUAI-ART12',   theme:'Hochrisiko-KI',  title:'Art. 12 – Aufzeichnungspflichten (Logging)' },
  { id:'EUAI-ART13',   theme:'Hochrisiko-KI',  title:'Art. 13 – Transparenz und Nutzerinformation' },
  { id:'EUAI-ART14',   theme:'Hochrisiko-KI',  title:'Art. 14 – Menschliche Aufsicht (Human Oversight)' },
  { id:'EUAI-ART15',   theme:'Hochrisiko-KI',  title:'Art. 15 – Genauigkeit, Robustheit und Cybersicherheit' },
  // Konformitätsbewertung und Marktüberwachung (Art. 16–27)
  { id:'EUAI-ART16',   theme:'Konformität',    title:'Art. 16 – Pflichten der Anbieter (Provider Obligations)' },
  { id:'EUAI-ART17',   theme:'Konformität',    title:'Art. 17 – Qualitätsmanagementsystem' },
  { id:'EUAI-ART18',   theme:'Konformität',    title:'Art. 18 – Technische Dokumentation aufbewahren' },
  { id:'EUAI-ART43',   theme:'Konformität',    title:'Art. 43 – Konformitätsbewertungsverfahren' },
  // GPAI – General Purpose AI (Titel VIII, Art. 53–55)
  { id:'EUAI-ART53',   theme:'GPAI',           title:'Art. 53 – Pflichten der Anbieter von GPAI-Modellen' },
  { id:'EUAI-ART54',   theme:'GPAI',           title:'Art. 54 – Transparenzpflichten für GPAI mit systemischem Risiko' },
  { id:'EUAI-ART55',   theme:'GPAI',           title:'Art. 55 – Bewertung und Minderung systemischer Risiken' },
  // Verbotene KI-Praktiken (Art. 5)
  { id:'EUAI-ART5',    theme:'Verbote',        title:'Art. 5 – Verbotene KI-Praktiken (Prohibited AI Practices)' },
  // Governance
  { id:'EUAI-GOV.1',   theme:'Governance',     title:'KI-Strategie und interne KI-Governance' },
  { id:'EUAI-GOV.2',   theme:'Governance',     title:'KI-Inventar und Risikoklassifizierung eingesetzter Systeme' },
  { id:'EUAI-GOV.3',   theme:'Governance',     title:'Verantwortliche Stelle und KI-Beauftragter' },
].map(c => ({ ...c, framework: 'EUAI' }))

// ─────────────────────────────────────────────────────────────────
// ISO 9000:2015 – Grundlagen und Begriffe (7 Qualitätsgrundsätze + Konzeptgruppen)
// ─────────────────────────────────────────────────────────────────
const ISO9000_CONTROLS = [
  // 7 Qualitätsgrundsätze
  { id:'ISO9000-P1', theme:'Qualitätsgrundsätze', title:'Kundenorientierung' },
  { id:'ISO9000-P2', theme:'Qualitätsgrundsätze', title:'Führung' },
  { id:'ISO9000-P3', theme:'Qualitätsgrundsätze', title:'Engagement von Personen' },
  { id:'ISO9000-P4', theme:'Qualitätsgrundsätze', title:'Prozessorientierter Ansatz' },
  { id:'ISO9000-P5', theme:'Qualitätsgrundsätze', title:'Verbesserung' },
  { id:'ISO9000-P6', theme:'Qualitätsgrundsätze', title:'Faktengestützte Entscheidungsfindung' },
  { id:'ISO9000-P7', theme:'Qualitätsgrundsätze', title:'Beziehungsmanagement' },
  // Grundlegende Konzepte
  { id:'ISO9000-C1', theme:'Grundkonzepte', title:'Qualität und ihre Wahrnehmung' },
  { id:'ISO9000-C2', theme:'Grundkonzepte', title:'Qualitätsmanagementsystem als System' },
  { id:'ISO9000-C3', theme:'Grundkonzepte', title:'Kontext einer Organisation' },
  { id:'ISO9000-C4', theme:'Grundkonzepte', title:'Interessierte Parteien' },
  { id:'ISO9000-C5', theme:'Grundkonzepte', title:'Unterstützung durch die oberste Leitung' },
].map(c => ({ ...c, framework: 'ISO9000' }))

// ─────────────────────────────────────────────────────────────────
// ISO 9001:2015 – Anforderungen QMS (Kapitel 4–10)
// ─────────────────────────────────────────────────────────────────
const ISO9001_CONTROLS = [
  // Kapitel 4 – Kontext der Organisation
  { id:'ISO9001-4.1',  theme:'Kontext',          title:'Verstehen der Organisation und ihres Kontexts' },
  { id:'ISO9001-4.2',  theme:'Kontext',          title:'Verstehen der Erfordernisse und Erwartungen interessierter Parteien' },
  { id:'ISO9001-4.3',  theme:'Kontext',          title:'Festlegen des Anwendungsbereichs des QMS' },
  { id:'ISO9001-4.4',  theme:'Kontext',          title:'QMS und seine Prozesse' },
  // Kapitel 5 – Führung
  { id:'ISO9001-5.1',  theme:'Führung',          title:'Führung und Verpflichtung' },
  { id:'ISO9001-5.1.1',theme:'Führung',          title:'Führung und Verpflichtung – Allgemeines' },
  { id:'ISO9001-5.1.2',theme:'Führung',          title:'Kundenorientierung' },
  { id:'ISO9001-5.2',  theme:'Führung',          title:'Politik' },
  { id:'ISO9001-5.2.1',theme:'Führung',          title:'Festlegen der Qualitätspolitik' },
  { id:'ISO9001-5.2.2',theme:'Führung',          title:'Bekanntmachen der Qualitätspolitik' },
  { id:'ISO9001-5.3',  theme:'Führung',          title:'Rollen, Verantwortlichkeiten und Befugnisse in der Organisation' },
  // Kapitel 6 – Planung
  { id:'ISO9001-6.1',  theme:'Planung',          title:'Maßnahmen zum Umgang mit Risiken und Chancen' },
  { id:'ISO9001-6.2',  theme:'Planung',          title:'Qualitätsziele und Planung zu deren Erreichung' },
  { id:'ISO9001-6.3',  theme:'Planung',          title:'Planung von Änderungen' },
  // Kapitel 7 – Unterstützung
  { id:'ISO9001-7.1',  theme:'Unterstützung',    title:'Ressourcen' },
  { id:'ISO9001-7.1.1',theme:'Unterstützung',    title:'Ressourcen – Allgemeines' },
  { id:'ISO9001-7.1.2',theme:'Unterstützung',    title:'Personen' },
  { id:'ISO9001-7.1.3',theme:'Unterstützung',    title:'Infrastruktur' },
  { id:'ISO9001-7.1.4',theme:'Unterstützung',    title:'Prozessumgebung' },
  { id:'ISO9001-7.1.5',theme:'Unterstützung',    title:'Ressourcen zur Überwachung und Messung' },
  { id:'ISO9001-7.1.6',theme:'Unterstützung',    title:'Wissen der Organisation' },
  { id:'ISO9001-7.2',  theme:'Unterstützung',    title:'Kompetenz' },
  { id:'ISO9001-7.3',  theme:'Unterstützung',    title:'Bewusstsein' },
  { id:'ISO9001-7.4',  theme:'Unterstützung',    title:'Kommunikation' },
  { id:'ISO9001-7.5',  theme:'Unterstützung',    title:'Dokumentierte Information' },
  { id:'ISO9001-7.5.1',theme:'Unterstützung',    title:'Dokumentierte Information – Allgemeines' },
  { id:'ISO9001-7.5.2',theme:'Unterstützung',    title:'Erstellen und Aktualisieren' },
  { id:'ISO9001-7.5.3',theme:'Unterstützung',    title:'Lenkung dokumentierter Information' },
  // Kapitel 8 – Betrieb
  { id:'ISO9001-8.1',  theme:'Betrieb',          title:'Betriebliche Planung und Steuerung' },
  { id:'ISO9001-8.2',  theme:'Betrieb',          title:'Anforderungen an Produkte und Dienstleistungen' },
  { id:'ISO9001-8.2.1',theme:'Betrieb',          title:'Kommunikation mit dem Kunden' },
  { id:'ISO9001-8.2.2',theme:'Betrieb',          title:'Bestimmen von Anforderungen für Produkte und Dienstleistungen' },
  { id:'ISO9001-8.2.3',theme:'Betrieb',          title:'Überprüfung der Anforderungen' },
  { id:'ISO9001-8.2.4',theme:'Betrieb',          title:'Änderungen der Anforderungen' },
  { id:'ISO9001-8.3',  theme:'Betrieb',          title:'Entwicklung von Produkten und Dienstleistungen' },
  { id:'ISO9001-8.3.1',theme:'Betrieb',          title:'Entwicklung – Allgemeines' },
  { id:'ISO9001-8.3.2',theme:'Betrieb',          title:'Entwicklungsplanung' },
  { id:'ISO9001-8.3.3',theme:'Betrieb',          title:'Entwicklungseingaben' },
  { id:'ISO9001-8.3.4',theme:'Betrieb',          title:'Entwicklungssteuerung' },
  { id:'ISO9001-8.3.5',theme:'Betrieb',          title:'Entwicklungsergebnisse' },
  { id:'ISO9001-8.3.6',theme:'Betrieb',          title:'Entwicklungsänderungen' },
  { id:'ISO9001-8.4',  theme:'Betrieb',          title:'Steuerung extern bereitgestellter Prozesse, Produkte und Dienstleistungen' },
  { id:'ISO9001-8.4.1',theme:'Betrieb',          title:'Steuerung extern bereitgestellter – Allgemeines' },
  { id:'ISO9001-8.4.2',theme:'Betrieb',          title:'Art und Umfang der Steuerung' },
  { id:'ISO9001-8.4.3',theme:'Betrieb',          title:'Informationen für externe Anbieter' },
  { id:'ISO9001-8.5',  theme:'Betrieb',          title:'Produktion und Dienstleistungserbringung' },
  { id:'ISO9001-8.5.1',theme:'Betrieb',          title:'Steuerung der Produktion und Dienstleistungserbringung' },
  { id:'ISO9001-8.5.2',theme:'Betrieb',          title:'Kennzeichnung und Rückverfolgbarkeit' },
  { id:'ISO9001-8.5.3',theme:'Betrieb',          title:'Eigentum der Kunden oder externer Anbieter' },
  { id:'ISO9001-8.5.4',theme:'Betrieb',          title:'Erhaltung' },
  { id:'ISO9001-8.5.5',theme:'Betrieb',          title:'Tätigkeiten nach der Lieferung' },
  { id:'ISO9001-8.5.6',theme:'Betrieb',          title:'Steuerung von Änderungen' },
  { id:'ISO9001-8.6',  theme:'Betrieb',          title:'Freigabe von Produkten und Dienstleistungen' },
  { id:'ISO9001-8.7',  theme:'Betrieb',          title:'Steuerung nichtkonformer Ergebnisse' },
  // Kapitel 9 – Bewertung der Leistung
  { id:'ISO9001-9.1',  theme:'Bewertung',        title:'Überwachung, Messung, Analyse und Bewertung' },
  { id:'ISO9001-9.1.1',theme:'Bewertung',        title:'Überwachung und Messung – Allgemeines' },
  { id:'ISO9001-9.1.2',theme:'Bewertung',        title:'Kundenzufriedenheit' },
  { id:'ISO9001-9.1.3',theme:'Bewertung',        title:'Analyse und Bewertung' },
  { id:'ISO9001-9.2',  theme:'Bewertung',        title:'Internes Audit' },
  { id:'ISO9001-9.3',  theme:'Bewertung',        title:'Managementbewertung' },
  { id:'ISO9001-9.3.1',theme:'Bewertung',        title:'Managementbewertung – Allgemeines' },
  { id:'ISO9001-9.3.2',theme:'Bewertung',        title:'Eingaben der Managementbewertung' },
  { id:'ISO9001-9.3.3',theme:'Bewertung',        title:'Ergebnisse der Managementbewertung' },
  // Kapitel 10 – Verbesserung
  { id:'ISO9001-10.1', theme:'Verbesserung',     title:'Allgemeines' },
  { id:'ISO9001-10.2', theme:'Verbesserung',     title:'Nichtkonformität und Korrekturmaßnahmen' },
  { id:'ISO9001-10.3', theme:'Verbesserung',     title:'Fortlaufende Verbesserung' },
].map(c => ({ ...c, framework: 'ISO9001' }))

// ─────────────────────────────────────────────────────────────────
// EU Cyber Resilience Act (CRA) – Anforderungen an Produkte mit digitalen Elementen
// Basis: Verordnung (EU) 2024/2847, in Kraft seit Okt. 2024
// ─────────────────────────────────────────────────────────────────
const CRA_CONTROLS = [
  // Artikel 6 – Grundlegende Cybersicherheitsanforderungen (Anhang I, Teil I)
  { id:'CRA-1.1',  theme:'Produktanforderungen', title:'Keine bekannten ausnutzbaren Schwachstellen bei Inverkehrbringen' },
  { id:'CRA-1.2',  theme:'Produktanforderungen', title:'Sicherheit durch Voreinstellungen (Security by Default)' },
  { id:'CRA-1.3',  theme:'Produktanforderungen', title:'Schutz vor unbefugtem Zugriff (Authentisierung, Autorisierung)' },
  { id:'CRA-1.4',  theme:'Produktanforderungen', title:'Schutz der Vertraulichkeit gespeicherter und übertragener Daten' },
  { id:'CRA-1.5',  theme:'Produktanforderungen', title:'Schutz der Integrität von Daten, Konfiguration und Befehlen' },
  { id:'CRA-1.6',  theme:'Produktanforderungen', title:'Minimierung der Angriffsfläche' },
  { id:'CRA-1.7',  theme:'Produktanforderungen', title:'Begrenzung der Auswirkungen von Sicherheitsvorfällen' },
  { id:'CRA-1.8',  theme:'Produktanforderungen', title:'Protokollierung sicherheitsrelevanter Ereignisse' },
  { id:'CRA-1.9',  theme:'Produktanforderungen', title:'Sicherheitsupdates und Patch-Fähigkeit' },
  { id:'CRA-1.10', theme:'Produktanforderungen', title:'Sicheres Löschen und Zurücksetzen von Daten' },
  { id:'CRA-1.11', theme:'Produktanforderungen', title:'Schutz gegen physische und elektromagnetische Angriffe' },
  // Anhang I, Teil II – Anforderungen an Schwachstellenmanagement
  { id:'CRA-2.1',  theme:'Schwachstellenmanagement', title:'Identifizierung und Dokumentation von Schwachstellen und Komponenten (SBOM)' },
  { id:'CRA-2.2',  theme:'Schwachstellenmanagement', title:'Umgehende Behebung von Schwachstellen' },
  { id:'CRA-2.3',  theme:'Schwachstellenmanagement', title:'Regelmäßige Tests und Überprüfungen der Sicherheit' },
  { id:'CRA-2.4',  theme:'Schwachstellenmanagement', title:'Koordinierte Offenlegung von Schwachstellen (CVD-Richtlinie)' },
  { id:'CRA-2.5',  theme:'Schwachstellenmanagement', title:'Bereitstellung von Sicherheitspatches ohne Kosten für den Nutzer' },
  { id:'CRA-2.6',  theme:'Schwachstellenmanagement', title:'Sicherheitsunterstützungszeitraum (Mindest 5 Jahre)' },
  // Artikel 13 / 14 – Pflichten der Hersteller
  { id:'CRA-3.1',  theme:'Herstellerpflichten', title:'Konformitätsbewertung vor Inverkehrbringen' },
  { id:'CRA-3.2',  theme:'Herstellerpflichten', title:'EU-Konformitätserklärung (DoC) und CE-Kennzeichnung' },
  { id:'CRA-3.3',  theme:'Herstellerpflichten', title:'Technische Dokumentation (Anhang VII)' },
  { id:'CRA-3.4',  theme:'Herstellerpflichten', title:'Meldung aktiv ausgenutzter Schwachstellen an ENISA (24h-Frühwarnung)' },
  { id:'CRA-3.5',  theme:'Herstellerpflichten', title:'Meldung schwerwiegender Sicherheitsvorfälle an ENISA' },
  { id:'CRA-3.6',  theme:'Herstellerpflichten', title:'Informierung betroffener Nutzer über Schwachstellen und Patches' },
  // Artikel 13 – Sicherheitsdokumentation und Benutzerinformation
  { id:'CRA-4.1',  theme:'Dokumentation & Transparenz', title:'Sicherheitsdokumentation für Nutzer (Anhang II)' },
  { id:'CRA-4.2',  theme:'Dokumentation & Transparenz', title:'Klare Informationen über Supportzeitraum und End-of-Life' },
  { id:'CRA-4.3',  theme:'Dokumentation & Transparenz', title:'Anleitung zur sicheren Konfiguration und Nutzung' },
  { id:'CRA-4.4',  theme:'Dokumentation & Transparenz', title:'Kontaktstelle für Schwachstellenmeldungen (Security Contact)' },
  // Artikel 20 – Importeure; Artikel 23 – Händler
  { id:'CRA-5.1',  theme:'Lieferkette', title:'Sorgfaltspflichten der Importeure (Konformitätsprüfung)' },
  { id:'CRA-5.2',  theme:'Lieferkette', title:'Sorgfaltspflichten der Händler' },
  { id:'CRA-5.3',  theme:'Lieferkette', title:'Sicherheit von Open-Source-Komponenten in der Lieferkette' },
].map(c => ({ ...c, framework: 'CRA' }))

// ─────────────────────────────────────────────────────────────────
// Alle Controls zusammenführen
// ─────────────────────────────────────────────────────────────────
const ALL_SEED_CONTROLS = [
  ...ISO27001_CONTROLS,
  ...BSI_CONTROLS,
  ...NIS2_CONTROLS,
  ...EUCS_CONTROLS,
  ...EUAI_CONTROLS,
  ...ISO9000_CONTROLS,
  ...ISO9001_CONTROLS,
  ...CRA_CONTROLS,
]

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function buildSeed() {
  const now = new Date().toISOString()
  const data = {}
  for (const c of ALL_SEED_CONTROLS) {
    data[c.id] = {
      id: c.id,
      framework: c.framework,
      theme: c.theme,
      title: c.title,
      applicable: true,
      status: 'not_started',
      owner: '',
      justification: '',
      linkedTemplates: [],
      updatedAt: now,
      updatedBy: 'system'
    }
  }
  return data
}

function load() {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    const seed = buildSeed()
    fs.writeFileSync(FILE, JSON.stringify(seed, null, 2))
    return seed
  }
  try {
    const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    // Merge any new seed controls not yet present (e.g. after adding a new framework)
    const seed = buildSeed()
    let changed = false
    for (const [id, ctrl] of Object.entries(seed)) {
      if (!existing[id]) { existing[id] = ctrl; changed = true }
    }
    if (changed) fs.writeFileSync(FILE, JSON.stringify(existing, null, 2))
    return existing
  } catch { return buildSeed() }
}

function save(data) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

let store = load()

module.exports = {
  init: () => { store = load() },

  getFrameworks: () => Object.values(FRAMEWORKS),

  getAll: ({ framework, theme } = {}) => {
    let all = Object.values(store)
    if (framework) all = all.filter(c => c.framework === framework)
    if (theme)     all = all.filter(c => c.theme === theme)
    return all
  },

  getById: (id) => store[id] || null,

  update: (id, fields, { changedBy } = {}) => {
    if (!store[id]) return null
    const allowed = ['applicable', 'status', 'owner', 'justification', 'linkedTemplates', 'applicableEntities']
    for (const key of allowed) {
      if (fields[key] !== undefined) store[id][key] = fields[key]
    }
    store[id].updatedAt = new Date().toISOString()
    store[id].updatedBy = changedBy || 'unknown'
    save(store)
    return store[id]
  },

  addLinkedTemplate: (controlId, templateId) => {
    if (!store[controlId]) return null
    if (!Array.isArray(store[controlId].linkedTemplates)) store[controlId].linkedTemplates = []
    if (!store[controlId].linkedTemplates.includes(templateId)) {
      store[controlId].linkedTemplates.push(templateId)
      store[controlId].updatedAt = new Date().toISOString()
      save(store)
    }
    return store[controlId]
  },

  removeLinkedTemplate: (controlId, templateId) => {
    if (!store[controlId]) return null
    if (!Array.isArray(store[controlId].linkedTemplates)) { store[controlId].linkedTemplates = []; return store[controlId] }
    store[controlId].linkedTemplates = store[controlId].linkedTemplates.filter(t => t !== templateId)
    store[controlId].updatedAt = new Date().toISOString()
    save(store)
    return store[controlId]
  },

  // Zusammenfassung – optional pro Framework
  getSummary: (framework) => {
    const frameworks = framework ? [framework] : Object.keys(FRAMEWORKS)
    const result = {}
    for (const fw of frameworks) {
      const controls = Object.values(store).filter(c => c.framework === fw)
      const applicable = controls.filter(c => c.applicable)
      const byStatus = { not_started: 0, partial: 0, implemented: 0, optimized: 0 }
      for (const c of applicable) {
        if (byStatus[c.status] !== undefined) byStatus[c.status]++
      }
      result[fw] = {
        framework: fw,
        label: FRAMEWORKS[fw]?.label || fw,
        color: FRAMEWORKS[fw]?.color || '#888',
        total: controls.length,
        applicable: applicable.length,
        notApplicable: controls.length - applicable.length,
        byStatus,
        implementationRate: applicable.length > 0
          ? Math.round((byStatus.implemented + byStatus.optimized) / applicable.length * 100)
          : 0
      }
    }
    return framework ? result[framework] : result
  },

  FRAMEWORKS,
  IMPLEMENTATION_STATUSES
}
