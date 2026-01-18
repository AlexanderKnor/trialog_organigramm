# 🐛 Debug Guide: USt-Problem bei unterschiedlichen Mitarbeitern

## Problem-Beschreibung

**Symptom:**
- Mitarbeiter A (USt-pflichtig): Sollte 595€ zeigen, zeigt aber 500€
- Mitarbeiter B (NICHT USt-pflichtig): Sollte 500€ zeigen, zeigt 500€ ✓
- Tabelle zeigt für BEIDE 595€ (falsch!)

---

## 🔍 Debug-Schritte

### Schritt 1: Browser-Konsole öffnen

1. F12 drücken (Developer Tools)
2. Tab "Console" öffnen
3. Neuen Umsatz erstellen

### Schritt 2: Logs prüfen

**Beim Laden des Dialogs:**
```
✓ Employee profile loaded for VAT check
   VAT Liable: true   ← SOLLTE für Mitarbeiter A "true" sein
   VAT Rate: 19       ← SOLLTE für Mitarbeiter B "false" sein
```

**Wenn NICHT erscheint:**
```
⚠️ RevenueService.getEmployeeProfile not available
```
→ **Problem:** ProfileService nicht korrekt verdrahtet

---

**Beim Eingeben des Betrags:**
```
💰 Calculation Preview: {
  employeeIsVATLiable: true,   ← SOLLTE unterschiedlich sein!
  profileLoaded: true,         ← SOLLTE true sein
  provisionNet: 500,
  provisionVAT: 95,            ← SOLLTE 0 sein für NICHT-USt-Mitarbeiter
}
```

---

**Beim Speichern:**
```
📸 Capturing provision & VAT snapshots for employee: abc123
   📊 VAT snapshot values:
      Owner VAT liable: true   ← SOLLTE unterschiedlich sein!
      Owner VAT rate: 19
```

**Wenn NICHT erscheint:**
```
⚠️ ProfileService not available - VAT snapshots will use defaults
```
→ **Problem:** ProfileService ist null

---

**In der Tabelle (beim Rendern):**
```
🔍 Rendering entry: {
  ownerIsVATLiable: true,     ← SOLLTE false sein für Mitarbeiter B
  ownerProvisionNet: 500,
  ownerProvisionVAT: 95,      ← SOLLTE 0 sein für Mitarbeiter B
  ownerPayoutAmount: 595,     ← SOLLTE 500 sein für Mitarbeiter B
}
```

---

## 🔧 Mögliche Probleme & Fixes

### Problem 1: ProfileService nicht verfügbar

**Check in Console:**
```javascript
// In Browser Console:
app.revenueService._profileService  // Sollte NICHT undefined sein
```

**Fix:** Siehe main.js Zeile 185-193 (bereits gefixt)

---

### Problem 2: User.taxInfo fehlt

**Check:** Öffne Firestore Console → `users/{employeeId}` → Prüfe ob `taxInfo` existiert

```json
{
  "taxInfo": {
    "isVatLiable": true,    ← MUSS existieren!
    "defaultVatRate": 19
  }
}
```

**Wenn fehlt:**
→ **Ursache:** Wizard hat taxInfo nicht gespeichert

**Fix:** User-Profil manuell ergänzen oder Wizard prüfen

---

### Problem 3: Alte Einträge (vor Migration)

**Check:** Prüfe ob Entry die neuen Felder hat

```javascript
// In Browser Console bei geöffnetem Entry:
entry.ownerIsVATLiable    // Sollte true/false sein (nicht undefined)
entry.ownerProvisionRate  // Sollte 50 sein (nicht null)
```

**Wenn undefined:**
→ **Ursache:** Entry wurde VOR der Code-Änderung erstellt

**Fix:**
1. Entry löschen und neu erstellen
2. ODER: Migration-Script ausführen

---

## 🧪 Test-Anleitung

### Test 1: Neuen USt-pflichtigen Mitarbeiter erstellen

1. Wizard öffnen → Neuer Mitarbeiter
2. Schritt 3 (Steuer): ☑ "Umsatzsteuerpflichtig"
3. Mitarbeiter speichern
4. Umsatz erfassen → 1000€ Netto + USt
5. **Erwartung:**
   - Live-Berechnung zeigt: 595€ Auszahlung
   - Tabelle zeigt: 595€ Auszahlung

---

### Test 2: Neuen Kleinunternehmer erstellen

1. Wizard öffnen → Neuer Mitarbeiter
2. Schritt 3 (Steuer): ☐ "Umsatzsteuerpflichtig" (NICHT aktivieren)
3. Mitarbeiter speichern
4. Umsatz erfassen → 1000€ Netto + USt
5. **Erwartung:**
   - Live-Berechnung zeigt: 500€ Auszahlung
   - Tabelle zeigt: 500€ Auszahlung

---

## 📝 Quick-Fix für existierende Mitarbeiter

### Firestore Console:

1. Öffne `users/{employeeId}`
2. Füge `taxInfo` Objekt hinzu:

```json
{
  "taxInfo": {
    "isVatLiable": true,      // ← true für USt-pflichtig, false für Kleinunternehmer
    "isSmallBusiness": false, // ← true für Kleinunternehmer (§19 UStG)
    "defaultVatRate": 19,
    "taxNumber": "",
    "vatNumber": ""
  }
}
```

3. Speichern
4. Neuen Umsatz erfassen → Sollte jetzt korrekt berechnen!

---

## 🎯 Checklist

- [ ] Browser-Konsole Logs prüfen
- [ ] ProfileService Verfügbarkeit prüfen
- [ ] User.taxInfo in Firestore prüfen
- [ ] Neuen Test-Entry erstellen (nach Code-Änderung)
- [ ] Alte Entries löschen oder migrieren

---

## 💡 Wenn alles nicht hilft

**Browser neu laden:**
```bash
Strg + Shift + R  (Hard Reload - Cache leeren)
```

**Firestore Cache leeren:**
1. Browser Dev Tools → Application → Clear Storage
2. Seite neu laden

---

## 📞 Nächste Schritte

1. **Öffne Browser Console**
2. **Erstelle neuen Umsatz**
3. **Kopiere ALLE Logs** aus Console
4. **Sende mir die Logs** → Ich kann dann genau sehen wo das Problem ist!

Die Debug-Logs zeigen uns GENAU wo das Problem liegt! 🎯
