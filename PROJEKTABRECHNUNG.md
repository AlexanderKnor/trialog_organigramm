# Projektabrechnung: Trialog Organigramm & Umsatzverwaltung

**Auftraggeber:** Trialog Makler Gruppe GmbH
**Projektbezeichnung:** Webbasiertes Verwaltungstool - Organigramm, Umsatztracking & Provisionskaskade
**Datum:** 19.02.2026

---

## 1. Projektübersicht

Entwicklung einer vollständigen, produktionsreifen Webanwendung zur internen Verwaltung der Unternehmensstruktur, Umsatzerfassung und automatisierten Provisionsberechnung. Die Anwendung wird im produktiven Einsatz bei der Trialog Makler Gruppe GmbH auf Firebase Hosting betrieben.

---

## 2. Leistungsübersicht nach Aufwand

### A. Konzept, Architektur & Datenmodell — 30h

| Tätigkeit | Detail |
|-----------|--------|
| Fachliche Anforderungsanalyse | Geschäftsprozesse (Provisionsmodell, Hierarchie, Stornierungen) verstehen und in technische Anforderungen übersetzen |
| Architekturentwurf | Clean Architecture mit Domain-Driven Design, Schichtentrennung (Domain / Data / Presentation), 86 Verzeichnisse |
| Datenmodell-Design | 5 Firestore-Collections (users, hierarchy_trees, revenue_entries, tracking_events, product_catalog), Relationen, Indizes |
| Provisionsmodell | Mehrstufiges Kaskadenmodell mit Snapshot-Sicherung, Tippgeber-Logik, Brutto/Netto-Behandlung |

### B. Core-Infrastruktur & Sicherheit — 25h

| Tätigkeit | Detail |
|-----------|--------|
| Firebase-Setup | Projekt-Konfiguration, Firestore mit Offline-Persistierung (40MB Cache), Analytics-Integration |
| Auth-System | Login/Logout, rollenbasierte Zugriffskontrolle (Admin/Mitarbeiter), Custom Claims, Session-Management |
| Cloud Functions (5 Stück) | `createEmployeeAccount`, `deleteEmployeeAccount`, `setUserRole`, `migrateUsersToCustomClaims`, `resolveUserUid` |
| Security Rules | Firestore-Regeln mit Validierungsfunktionen, Admin-Schutz, Token-Revocation bei Löschung |
| Fehlerbehandlung | Error-Hierarchie (DomainError, ValidationError, NotFoundError, etc.), Client-Error-Tracking |
| **Code:** | **20 Dateien Core + 1 Cloud Functions = 1.983 Zeilen** |

### C. Hierarchie-Tracking (Organigramm) — 40h

| Tätigkeit | Detail |
|-----------|--------|
| Baumstruktur-Engine | Rekursive Hierarchie mit konfigurierbarer Tiefe (max. 10 Ebenen), Eltern-Kind-Beziehungen |
| Interaktiver Editor | Drag-and-Drop Reorganisation mit Validierung, Zoom-Controls, visuelle Baumdarstellung |
| CRUD-Operationen | Mitarbeiter anlegen, bearbeiten, verschieben, löschen mit Kaskadierung |
| Echtzeit-Sync | Firestore-Listener für Live-Updates, Konflikterkennung, Versionshistorie |
| Provision-Konfiguration | Pro Mitarbeiter: Bank-, Versicherungs-, Immobilienprovision konfigurierbar |
| **Code:** | **38 Dateien, 6.788 Zeilen** |

### D. Umsatz-Tracking & Provisionskaskade — 55h

| Tätigkeit | Detail |
|-----------|--------|
| Umsatzerfassung | Formular mit Kategorien (Bank, Versicherung, Immobilien, Hausverwaltung, Energie), MwSt-Berechnung |
| Provisionskaskade | Automatische Berechnung: Mitarbeiter -> Vorgesetzte -> Geschäftsführung -> Unternehmen (100% - höchste Provision) |
| Tippgeber-System | Eigene Provisionslogik, Abzug vom Eigentümer-Anteil, konfigurierbare Prozentsätze |
| Snapshot-Sicherung | Provisionssätze werden bei Eintrag eingefroren (Schutz vor nachträglichen Änderungen) |
| Stornierungsmanagement | Status-Workflow (aktiv, storniert, abgelehnt), Stornierungsansicht mit Filterung |
| 4 Ansichtsmodi | Tabellenansicht, Dashboard mit Statistiken, Rankings (Top-Performer), Stornierungsübersicht |
| 4 Perspektiven | Eigene Umsätze, Team-Umsätze, Tippgeber-Umsätze, Unternehmens-Umsätze |
| **Code:** | **30 Dateien, 8.825 Zeilen (umfangreichstes Modul)** |

### E. WIFO-Import — 30h

| Tätigkeit | Detail |
|-----------|--------|
| Excel-Parser | Automatische Erkennung von Spalten und Datumsformaten via SheetJS |
| Fuzzy-Matching | Algorithmus zur automatischen Zuordnung von Importdaten zu Mitarbeitern (Namensähnlichkeit) |
| Validierungspipeline | Mehrstufige Prüfung der Importdaten mit Fehler-/Warnungsreporting |
| Import-Wizard | Mehrstufiger Assistent (Dateiauswahl -> Vorschau -> Zuordnung -> Import -> Ergebnis) |
| **Code:** | **39 Dateien, 5.675 Zeilen** |

### F. Produktkatalog — 20h

| Tätigkeit | Detail |
|-----------|--------|
| Katalogverwaltung | CRUD für Versicherungs-/Bankprodukte mit Kategorisierung und Suchfunktion |
| Produktverknüpfung | Zuordnung von Produkten zu Umsatzeinträgen |
| **Code:** | **28 Dateien, 4.517 Zeilen** |

### G. Abrechnungs-Export & Benutzerprofil — 25h

| Tätigkeit | Detail |
|-----------|--------|
| PDF-Generierung | Provisionsabrechnungen pro Mitarbeiter als PDF (jsPDF), formatiert mit Firmenlogo |
| Abrechnungszeitraum | Monats-/Jahresfilter, Zusammenfassung nach Kategorien |
| Benutzerprofil | Profilansicht, Passwortänderung mit Re-Authentifizierung, Rollenverwaltung |
| **Code:** | **42 Dateien, 6.352 Zeilen** |

### H. UI/UX Design & Styling — 35h

| Tätigkeit | Detail |
|-----------|--------|
| Design-System | CSS-Variablen (Design Tokens), einheitliche Farbpalette, Typografie, Abstände |
| 20 CSS-Dateien | Spezialisierte Stylesheets pro Feature und Komponententyp |
| Responsive Design | Mobile-Optimierung, adaptive Layouts, Touch-Unterstützung |
| Animationen & Übergänge | Ranking-Animationen, Dialog-Transitions, Loading-States |
| Barrierefreiheit | Keyboard-Navigation, Focus-States, semantisches Markup |
| **Code:** | **20 Dateien, 17.093 Zeilen CSS** |

### I. Deployment, Testing & laufender Betrieb — 10h

| Tätigkeit | Detail |
|-----------|--------|
| Firebase Hosting | Deployment-Konfiguration, Caching-Strategie (5min Assets, No-Cache Index) |
| Datenbankindizes | Composite-Indizes für performante Abfragen konfiguriert und deployed |
| Fehlerbehebung | Laufende Bugfixes im Produktivbetrieb |
| Monitoring | Client-seitiges Error-Tracking (SessionStorage, letzte 50 Fehler) |

---

## 3. Aufwands- und Kostenübersicht

| Pos. | Leistung | Stunden | Betrag |
|------|----------|---------|--------|
| A | Konzept, Architektur & Datenmodell | 30h | 480 EUR |
| B | Core-Infrastruktur & Sicherheit | 25h | 400 EUR |
| C | Hierarchie-Tracking (Organigramm) | 40h | 640 EUR |
| D | Umsatz-Tracking & Provisionskaskade | 55h | 880 EUR |
| E | WIFO-Import | 30h | 480 EUR |
| F | Produktkatalog | 20h | 320 EUR |
| G | Abrechnungs-Export & Benutzerprofil | 25h | 400 EUR |
| H | UI/UX Design & Styling | 35h | 560 EUR |
| I | Deployment, Testing & Betrieb | 10h | 160 EUR |
| | | | |
| | **Summe nach Aufwand** | **270h** | **4.320 EUR** |
| | **Projektpauschale (Sonderkonditionen)** | | **4.000 EUR** |

> **Effektiver Stundensatz: 14,81 EUR/h**
> Branchenüblicher Freelancer-Stundensatz (Deutschland): 80-120 EUR/h

---

## 4. Zahlungsplan

| Meilenstein | Beschreibung | Betrag | Status |
|-------------|-------------|--------|--------|
| **Meilenstein 1** | Anzahlung bei Projektstart | **1.000 EUR** | bezahlt |
| **Meilenstein 2** | Auslieferung der Anwendung im Produktivbetrieb | **2.000 EUR** | offen - fällig |
| **Meilenstein 3** | Abnahme nach Bugfixing-Phase (100% fehlerfrei) | **1.000 EUR** | offen - nach Abnahme |
| | **Gesamtsumme** | **4.000 EUR** | |

### Bedingungen Meilenstein 3
- Alle gemeldeten Fehler werden behoben
- Abnahme durch den Auftraggeber nach Testphase
- Fälligkeit: nach schriftlicher Bestätigung der fehlerfreien Funktion

---

## 5. Technologie-Stack

| Komponente | Technologie |
|-----------|-------------|
| Frontend | Vanilla JavaScript ES6+ (modular, ohne Framework-Abhängigkeit) |
| Backend | Firebase Cloud Functions (Node.js) |
| Datenbank | Cloud Firestore (NoSQL, Offline-fähig) |
| Authentifizierung | Firebase Auth mit Custom Claims (RBAC) |
| Hosting | Firebase Hosting mit CDN |
| PDF-Export | jsPDF (clientseitig) |
| Excel-Import | SheetJS (clientseitig) |
| Security | Firestore Security Rules, RBAC, Token-Revocation |

---

## 6. Lieferumfang

- Vollständiger Quellcode auf Anfrage möglich (Git-Repository)
- Produktives Deployment auf Firebase Hosting
- Firebase Cloud Functions (deployed)
- Firestore Security Rules (deployed)
- Datenbankindizes (deployed)
- Lauffähige Anwendung im Produktivbetrieb
- Bugfixing bis zur finalen Abnahme

---

## 7. Einordnung

| Kennzahl | Wert |
|----------|------|
| Gesamter Code | 52.978 Zeilen |
| Quelldateien | 220+ |
| Fachmodule | 6 vollständige Module |
| Cloud Functions | 5 serverseitige Endpunkte |
| CSS-Stylesheets | 20 spezialisierte Dateien |
| Verzeichnisse | 86 |
| Geschätzter Aufwand | 270 Stunden |
| Marktpreis (80 EUR/h) | ca. 21.600 EUR |
| Agentur-Preis | ca. 35.000-60.000 EUR |
| **Vereinbarte Projektpauschale** | **4.000 EUR (Sonderkonditionen)** |

---

*Dokument erstellt am 19.02.2026*
