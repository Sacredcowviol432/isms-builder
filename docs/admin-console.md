# Admin Console (RBAC Verwaltung)

Ziel dieser Admin Console ist die einfache, robuste Verwaltung von Benutzerberechtigungen auf der Systemebene. Die Console ist eigenständig als Seite implementiert und bietet zwei Ansichtsmodi: Card View (Karten-Ansicht) und Table View (Tabellenansicht).

Inhalt:
- Zwei Ansichtsmodi (Card View, Table View)
- Checkboxen pro Section in Card View; Tabellenform in Table View
- Ladestruktur für Benutzer und deren Berechtigungen aus der RBAC-Store-Datei
- Save-Funktion zum Persistieren der Auswahl
- Zugriffsschutz: Nur Admins können Berechtigungen ändern

Hinweise zur Nutzung:
- Admin Console ist unter /admin.html erreichbar
- Zugriff erfolgt über den Header-Authentifizierungsmechanismus (X-User-Name, X-User-Role)
- In der nächsten Iteration wird eine Export/Import-Funktion, Auditing und eine echte Identity-Provider-Integration ergänzt
