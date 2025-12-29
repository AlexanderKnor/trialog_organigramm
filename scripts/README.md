# 🛠️ Admin Scripts

Dieses Verzeichnis enthält Utility-Scripts für administrative Aufgaben.

---

## 📋 Verfügbare Scripts

### 1. `migrate-custom-claims.js`

**Zweck:** Migriert alle Benutzer zu Firebase Custom Claims.

**Verwendung:**
1. Öffne die Hauptanwendung: https://trialog-8a95b.web.app
2. Melde dich als Admin an
3. Öffne die Browser-Console (`F12`)
4. Kopiere den **gesamten Inhalt** von `migrate-custom-claims.js`
5. Füge ihn in die Console ein und drücke `Enter`

**Was passiert:**
- Alle Benutzer bekommen Custom Claims gesetzt
- Admin-E-Mails (aus der Admin-Liste) bekommen `role: 'admin'`
- Alle anderen bekommen `role: 'employee'`

**Nach der Migration:**
- ⚠️ **WICHTIG:** Ausloggen und neu einloggen!
- Custom Claims werden erst nach erneutem Login aktiv

---

### 2. `cleanup-catalog.js`

**Zweck:** Bereinigt den Produkt-Katalog (entfernt Duplikate, stellt fehlende Kategorien wieder her).

**Verwendung:** (Siehe Datei-Kommentare)

---

## ⚠️ Sicherheitshinweise

- **Nur für Admins:** Diese Scripts können nur von Administratoren ausgeführt werden
- **Produktions-Umgebung:** Vorsicht beim Ausführen in der Produktions-Umgebung
- **Backup:** Stelle sicher, dass du Backups hast, bevor du Migrations-Scripts ausführst

---

## 🔧 Troubleshooting

### "Firebase App not found"
**Problem:** Script kann Firebase App nicht finden
**Lösung:** Stelle sicher, dass du in der Hauptanwendung angemeldet bist

### "Permission denied"
**Problem:** Du hast keine Admin-Rechte
**Lösung:** Melde dich als Admin an (E-Mail muss in der Admin-Liste sein)

### "Function not found"
**Problem:** Cloud Function wurde nicht deployed
**Lösung:** Führe aus: `firebase deploy --only functions`

### CORS-Fehler
**Problem:** Cloud Functions blockieren Anfragen
**Lösung:** Stelle sicher, dass du die Hauptanwendung von Firebase Hosting aufrufst (nicht localhost)

---

## 📚 Weitere Informationen

Für Details zur Architektur und Implementierung siehe:
- `/functions/index.js` - Cloud Functions
- `/firestore.rules` - Firestore Security Rules
- `/CATALOG_CLEANUP.md` - Katalog-Bereinigung
