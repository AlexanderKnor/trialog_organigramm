# 📋 Umsatzsteuer-Implementation Guide

**Version:** 1.2.0
**Datum:** 2025-12-29
**Implementiert von:** Claude (Sonnet 4.5)

---

## 🎯 Executive Summary

Diese Implementation behebt die USt-Berechnung im Revenue-Tracking System und führt eine **korrekte Vorsteuer-Logik** ein:

### Vorher (❌ Falsch):
- User gibt **Netto-Betrag** ein → System berechnet Brutto
- Provision basiert auf eingegebenem Betrag (verwirrend)
- **Keine** Berücksichtigung der Mitarbeiter-USt-Pflicht
- **Keine** Vorsteuer-Berechnung für Trialog

### Nachher (✅ Korrekt):
- User gibt **Brutto-Betrag** ein → System berechnet Netto
- Provision basiert auf **Netto-Umsatz** (korrekt)
- **Automatische** Berücksichtigung der Mitarbeiter-USt-Pflicht
- **Vollständige** Vorsteuer-Berechnung für Trialog

---

## 📊 Geschäftsprozess (Beispiel-Rechnung)

```
┌─────────────────────────────────────────────────────────────┐
│ UMSATZ VOM PRODUKTGEBER                                      │
├─────────────────────────────────────────────────────────────┤
│ Brutto:  1.190,00€                                          │
│ Netto:   1.000,00€                                          │
│ USt:       190,00€                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROVISIONS-VERTEILUNG (alle USt-pflichtig)                   │
├─────────────────────────────────────────────────────────────┤
│ Mitarbeiter A (50%):                                        │
│   Provision: 500,00€ netto                                  │
│   + USt:      95,00€                                        │
│   = Auszahlung: 595,00€ ← Mitarbeiter stellt Rechnung      │
│                                                              │
│ Manager (25%):                                              │
│   Provision: 250,00€ netto                                  │
│   + USt:      47,50€                                        │
│   = Auszahlung: 297,50€                                     │
│                                                              │
│ Geschäftsführer (15%):                                      │
│   Provision: 150,00€ netto                                  │
│   + USt:      28,50€                                        │
│   = Auszahlung: 178,50€                                     │
│                                                              │
│ Company (10%):                                              │
│   Provision: 100,00€ netto (keine USt, intern)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TRIALOG's USt-RECHNUNG (Voranmeldung)                       │
├─────────────────────────────────────────────────────────────┤
│ + Erhaltene USt (von Produktgebern):     190,00€           │
│ - Vorsteuer (an Mitarbeiter):           -171,00€           │
│                                          ────────           │
│ = Zahllast ans Finanzamt:                 19,00€ ✓         │
├─────────────────────────────────────────────────────────────┤
│ Unternehmens-Gewinn (vor Steuern):       100,00€ ✓         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technische Änderungen

### 1. Domain Layer

#### A. **RevenueEntry.js** (Kern-Änderung)

**Neue Felder:**
```javascript
// REVENUE (Umsatz vom Produktgeber)
#revenueAmount;          // Brutto-Betrag (1.190€)
#revenueHasVAT;         // true/false
#revenueVATRate;        // 19%

// PROVISION (Mitarbeiter-Anteil)
#ownerProvisionRate;     // 50%
#ownerIsVATLiable;      // true/false (Snapshot!)
#ownerVATRate;          // 19% (Snapshot!)

// TIP PROVIDER
#tipProviderIsVATLiable; // true/false (Snapshot!)
#tipProviderVATRate;     // 19% (Snapshot!)
```

**Neue Getter:**
```javascript
// Revenue
entry.revenueGross      // 1.190€ (Input)
entry.revenueNet        // 1.000€ (Berechnet: Brutto / 1.19)
entry.revenueVAT        //   190€ (Berechnet: Brutto - Netto)

// Owner Provision
entry.ownerProvisionNet   // 500€ (50% von Netto)
entry.ownerProvisionVAT   //  95€ (19% von Provision, wenn USt-pflichtig)
entry.ownerProvisionGross // 595€ (Netto + USt)
entry.ownerPayoutAmount   // 595€ (Alias)

// Tip Provider Provision
entry.tipProviderProvisionNet
entry.tipProviderProvisionVAT
entry.tipProviderProvisionGross
```

**Backward Compatibility:**
```javascript
// Legacy Getter (DEPRECATED, aber funktionieren noch)
entry.netAmount          → entry.revenueNet
entry.grossAmount        → entry.revenueGross
entry.vatAmount          → entry.revenueVAT
entry.provisionAmount    → entry.revenueAmount
entry.hasVAT             → entry.revenueHasVAT
```

---

#### B. **HierarchicalRevenueEntry.js**

**Neue Felder:**
```javascript
#managerIsVATLiable;    // Snapshot von Manager's USt-Status
#managerVATRate;        // Snapshot von Manager's USt-Satz
```

**Neue Getter:**
```javascript
entry.managerProvisionNet    // 250€
entry.managerProvisionVAT    //  47,50€
entry.managerProvisionGross  // 297,50€
entry.managerPayoutAmount    // 297,50€
```

---

#### C. **CompanyRevenueEntry.js** (Wichtigste Änderung!)

**Neue Felder:**
```javascript
#totalProvisionVATPaid;   // Summe USt an alle Mitarbeiter (Vorsteuer)
#revenueVATReceived;      // Erhaltene USt vom Produktgeber
#netVATDue;               // Netto-Zahllast ans Finanzamt
#hierarchyProvisions;     // Array mit allen Provisions-Details
```

**Neue Getter:**
```javascript
entry.totalProvisionVATPaid      // 171€ (Vorsteuer)
entry.revenueVATReceived         // 190€ (Umsatzsteuer)
entry.netVATDue                  //  19€ (Zahllast)
entry.companyProfitAfterVAT      //  81€ (100€ - 19€)
entry.totalPayoutToEmployees     // 1.071€ (Summe aller Auszahlungen)
entry.hierarchyProvisions        // Detaillierte Aufschlüsselung
```

**Hierarchie-Provisions-Array:**
```javascript
hierarchyProvisions: [
  {
    employeeId: 'employee-123',
    employeeName: 'Max Mustermann',
    level: 'owner',
    provisionRate: 50,
    provisionNet: 500,
    provisionVAT: 95,
    provisionGross: 595,
    payoutAmount: 595,
    isVATLiable: true,
    vatRate: 19,
  },
  {
    employeeId: 'manager-456',
    employeeName: 'Anna Schmidt',
    level: 'manager_L1',
    provisionRate: 25,  // Differenz: 75% - 50%
    provisionNet: 250,
    provisionVAT: 47.50,
    provisionGross: 297.50,
    payoutAmount: 297.50,
    isVATLiable: true,
    vatRate: 19,
  },
  // ... weitere Hierarchie-Ebenen
]
```

---

### 2. Service Layer

#### **RevenueService.js**

**Neue Dependencies:**
```javascript
constructor(revenueRepository, hierarchyService, catalogService, profileService) {
  // ProfileService jetzt required für USt-Snapshots!
}
```

**Erweiterte Methode:**
```javascript
async #captureProvisionSnapshots(employeeId, entryData) {
  // Holt jetzt ZUSÄTZLICH:
  // - ownerIsVATLiable (von User.taxInfo)
  // - ownerVATRate (von User.taxInfo)
  // - tipProviderIsVATLiable (von User.taxInfo)
  // - tipProviderVATRate (von User.taxInfo)
}
```

**Neue Methode:**
```javascript
async getEmployeeProfile(employeeId) {
  // Bridge-Methode zu ProfileService
  // Wird von AddRevenueDialog genutzt
}
```

---

### 3. Presentation Layer

#### A. **AddRevenueDialog.js**

**UI-Änderungen:**
```javascript
// VORHER:
label: 'Umsatz Netto (EUR)'
checkbox: 'Umsatzsteuer (19%) - Bruttowert wird berechnet'

// NACHHER:
label: 'Umsatz Brutto (EUR)'
checkbox: 'Umsatzsteuer (19%) - Nettowert wird aus Brutto berechnet'
```

**Neue Features:**
1. **Live-Berechnung:** Zeigt Umsatz, Provision und Auszahlung in Echtzeit
2. **Auto-Aktivierung:** USt-Checkbox wird automatisch aktiviert wenn Mitarbeiter USt-pflichtig
3. **Provisions-Preview:** User sieht seine Auszahlung VOR dem Speichern

**Live-Berechnung zeigt:**
```
┌─────────────────────────────────────┐
│ 💰 Berechnung                       │
├─────────────────────────────────────┤
│ Umsatz (vom Produktgeber):          │
│   Brutto: 1.190,00 €                │
│   Netto:  1.000,00 €                │
│   USt:      190,00 €                │
│                                     │
│ Ihre Provision (50,0%):             │
│   Netto: 500,00 €                   │
│   + USt:  95,00 €                   │
│                                     │
│ 💳 Auszahlung an Sie:               │
│   Gesamt: 595,00 €                  │
│                                     │
│ ℹ️ Sie sind umsatzsteuerpflichtig   │
│    - die 95,00 € USt führen Sie     │
│    ans Finanzamt ab.                │
└─────────────────────────────────────┘
```

---

#### B. **RevenueTable.js**

**Neue Spalten-Anzeige:**
```
┌──────────────────────────────────────┐
│ Umsatz: 1.000,00 € / 1.190,00 €     │
│ Prov. (50,0%): 500,00 € + 95,00 € USt│
│ Auszahlung: 595,00 €                 │
└──────────────────────────────────────┘
```

**Statt vorher:**
```
┌──────────────────────────────────────┐
│ Netto: 1.000,00 €                    │
│ Brutto: 1.190,00 €                   │
└──────────────────────────────────────┘
```

---

#### C. **RevenueScreen.js** (Company View)

**Neue USt-Übersicht:**
```
┌──────────────────────────────────────────────────────────┐
│ 📊 Umsatzsteuer-Übersicht (Trialog GmbH)                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Erhaltene USt (von Produktgebern):        + 1.900,00€    │
│ Gezahlte USt (Vorsteuer an Mitarbeiter):  - 1.710,00€    │
│ ─────────────────────────────────────────────────────    │
│ Zahllast ans Finanzamt:                      190,00€ ⚠️   │
│                                                           │
│ ─────────────────────────────────────────────────────    │
│ Gesamt-Auszahlungen an Mitarbeiter:      10.710,00€      │
│ Unternehmens-Gewinn (vor Steuern):         1.000,00€ ✓   │
│                                                           │
│ ℹ️ Die Zahllast ergibt sich aus: Erhaltene USt −          │
│    Vorsteuer (an Mitarbeiter gezahlt)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Migration & Backward Compatibility

### Bestehende Daten bleiben funktionsfähig!

**Alte Einträge (ohne neue Felder):**
```javascript
// Firestore Dokument (alt)
{
  provisionAmount: 1000,    // War als "Netto" gemeint
  hasVAT: true,
  vatRate: 19
  // ← Keine ownerProvisionRate, ownerIsVATLiable etc.
}

// System-Verhalten:
// - Verwendet LEGACY-Getter (netAmount, grossAmount)
// - Berechnung: 1000€ + 190€ = 1190€ (alte Logik)
// - ABER: Neue Provisions-Berechnung funktioniert NICHT
```

**⚠️ WICHTIG: Alte Einträge müssen migriert werden!**

---

## 📝 Migrations-Script (Firestore)

### Option 1: Automatische Migration bei Display

```javascript
// RevenueEntry.fromJSON() macht automatisch Fallback:
static fromJSON(json) {
  return new RevenueEntry({
    // NEUE Felder werden bevorzugt
    revenueAmount: json.revenueAmount !== undefined
      ? json.revenueAmount
      : json.provisionAmount,  // ← Fallback auf altes Feld

    ownerProvisionRate: json.ownerProvisionRate
      ?? json.ownerProvisionSnapshot,  // ← Fallback

    ownerIsVATLiable: json.ownerIsVATLiable ?? false,  // ← Default
  });
}
```

---

### Option 2: Firestore Batch-Migration

**Script:** `scripts/migrate-revenue-vat.js`

```javascript
/**
 * Migration Script: Update all revenue entries with new VAT fields
 *
 * ACHTUNG: Dieses Script ändert ALLE bestehenden Revenue Entries!
 * Backup erstellen BEVOR das Script ausgeführt wird!
 */

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateRevenueEntries() {
  console.log('🔄 Starting Revenue VAT Migration...');

  const entries = await db.collection('revenue_entries').get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of entries.docs) {
    const data = doc.data();

    // Skip if already migrated
    if (data.ownerProvisionRate !== undefined) {
      skipped++;
      continue;
    }

    // Migration logic:
    // 1. revenueAmount = provisionAmount (behält den Wert)
    // 2. ownerProvisionRate = ownerProvisionSnapshot
    // 3. ownerIsVATLiable = false (conservative default)

    const updates = {
      revenueAmount: data.provisionAmount || 0,
      revenueHasVAT: data.hasVAT || false,
      revenueVATRate: data.vatRate || 19,

      ownerProvisionRate: data.ownerProvisionSnapshot || null,
      ownerIsVATLiable: false,  // ACHTUNG: Muss manuell geprüft werden!
      ownerVATRate: 19,

      tipProviderIsVATLiable: false,
      tipProviderVATRate: 19,

      _migrated: true,
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await doc.ref.update(updates);
    migrated++;

    if (migrated % 100 === 0) {
      console.log(`✓ Migrated ${migrated} entries...`);
    }
  }

  console.log(`✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${entries.size}`);
}

migrateRevenueEntries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
```

**Ausführung:**
```bash
cd /mnt/c/myProjects/trialog_strukturplan_html/scripts
node migrate-revenue-vat.js
```

---

## 🎨 CSS-Styles

**Neue Datei:** `styles/revenue-vat-enhancements.css`

**Wichtige Klassen:**
- `.calculation-preview-container` - Live-Berechnung im Dialog
- `.vat-summary-card` - USt-Übersicht im Company Dashboard
- `.revenue-provision-breakdown` - Umsatz/Provision Breakdown in Tabelle
- `.breakdown-line` - Einzelne Zeilen im Breakdown
- `.payout-line` - Hervorgehobene Auszahlungs-Zeile

---

## 🔐 Wichtige Hinweise

### 1. USt-Pflicht wird als Snapshot gespeichert

**Warum?**
- Mitarbeiter kann USt-Status ändern (z.B. wird Kleinunternehmer)
- Alte Einträge sollen mit ALTEN Berechnungen bleiben (Immutability)
- Audit-Trail: Welcher USt-Status galt zum Zeitpunkt der Erstellung?

```javascript
// Beispiel:
// 01.01.2025: Mitarbeiter ist USt-pflichtig (19%)
// → Entry erstellt mit ownerIsVATLiable: true

// 01.06.2025: Mitarbeiter wird Kleinunternehmer
// → Neue Entries: ownerIsVATLiable: false
// → ALTE Entries behalten: ownerIsVATLiable: true ✓
```

---

### 2. Vorsteuer-Berechnung ist automatisch

**Trialog muss nichts manuell rechnen:**
- System berechnet automatisch:
  - Erhaltene USt (von Produktgebern)
  - Gezahlte USt (an Mitarbeiter)
  - Netto-Zahllast

**Export für Steuerbüro:**
```javascript
// CompanyRevenueEntry.toJSON() enthält ALLE Daten für Umsatzsteuer-Voranmeldung
{
  revenueVATReceived: 190,
  totalProvisionVATPaid: 171,
  netVATDue: 19,
  hierarchyProvisions: [...],  // Detaillierte Aufschlüsselung
}
```

---

### 3. Kleinunternehmer-Behandlung

**Wenn Mitarbeiter Kleinunternehmer (§19 UStG):**
```javascript
user.taxInfo.isSmallBusiness = true;
user.taxInfo.isVatLiable = false;

// → Bei Entry-Erstellung:
entry.ownerIsVATLiable = false;
entry.ownerProvisionVAT = 0;
entry.ownerPayoutAmount = 500€ (keine USt)

// → In Live-Berechnung:
"Sie sind Kleinunternehmer - keine Umsatzsteuer"
```

---

## 🧪 Test-Fälle

### Test 1: USt-pflichtiger Mitarbeiter

```javascript
// Input
revenueAmount: 1190,    // Brutto
revenueHasVAT: true,
ownerProvisionRate: 50,
ownerIsVATLiable: true,
ownerVATRate: 19,

// Expected Output
revenueGross: 1190,
revenueNet: 1000,
revenueVAT: 190,
ownerProvisionNet: 500,
ownerProvisionVAT: 95,
ownerPayoutAmount: 595,
```

---

### Test 2: Kleinunternehmer

```javascript
// Input
revenueAmount: 1000,    // Kein Brutto/Netto Unterschied
revenueHasVAT: false,
ownerProvisionRate: 50,
ownerIsVATLiable: false,  // Kleinunternehmer!

// Expected Output
revenueGross: 1000,
revenueNet: 1000,
revenueVAT: 0,
ownerProvisionNet: 500,
ownerProvisionVAT: 0,
ownerPayoutAmount: 500,  // Keine USt!
```

---

### Test 3: Hierarchische Provision mit USt

```javascript
// Input
Manager: 75% Provision, USt-pflichtig
Owner: 50% Provision, USt-pflichtig

// Expected (HierarchicalRevenueEntry)
managerProvisionRate: 25,  // Differenz: 75% - 50%
managerProvisionNet: 250,  // 25% von 1000€
managerProvisionVAT: 47.50,
managerPayoutAmount: 297.50,
```

---

### Test 4: Company mit Vorsteuer

```javascript
// Input
10 Entries à 1.000€ netto / 1.190€ brutto
Alle Mitarbeiter USt-pflichtig

// Expected (CompanyRevenueEntry aggregiert)
revenueVATReceived: 1900,       // 10 × 190€
totalProvisionVATPaid: 1710,    // Summe aller Mitarbeiter-USt
netVATDue: 190,                 // 1900 - 1710
companyProvision: 1000,         // 10% von 10.000€
companyProfitAfterVAT: 810,     // 1000 - 190
```

---

## 📦 Deployment Checklist

### Vor dem Deployment:

- [ ] Firestore Backup erstellen
- [ ] Migration-Script testen (auf Kopie der Datenbank)
- [ ] CSS-Datei in index.html eingebunden
- [ ] ProfileService in main.js korrekt verdrahtet
- [ ] Browser-Tests durchführen

### Nach dem Deployment:

- [ ] Migration-Script ausführen (wenn gewünscht)
- [ ] Alte Einträge überprüfen (sollten noch angezeigt werden)
- [ ] Neue Einträge testen (mit Live-Berechnung)
- [ ] Company Dashboard USt-Übersicht prüfen
- [ ] Auszahlungsbeträge mit Buchhaltung abgleichen

---

## ❓ FAQ

**Q: Was passiert mit alten Einträgen?**
A: Sie funktionieren weiterhin, aber haben KEINE Provisions-USt-Berechnung. Migration empfohlen.

**Q: Muss ich alle Einträge migrieren?**
A: Nein. Backward Compatibility ist eingebaut. ABER für korrekte Auszahlungsbeträge: Ja.

**Q: Was wenn Mitarbeiter-USt-Status sich ändert?**
A: Alte Einträge behalten alten Status (Snapshot). Neue Einträge verwenden neuen Status.

**Q: Kann ich die alten Felder noch verwenden?**
A: Ja, aber sie sind DEPRECATED. Verwende neue Felder (`revenueNet`, `ownerProvisionNet` etc.)

**Q: Was wenn ProfileService nicht verfügbar ist?**
A: Fallback auf Default-Werte (ownerIsVATLiable = false, ownerVATRate = 19)

---

## 📞 Support & Kontakt

Bei Fragen oder Problemen:
- **Technische Fragen:** Code-Kommentare in den geänderten Dateien
- **Business-Logik:** Siehe Beispiel-Rechnungen oben
- **Migration:** Siehe Migrations-Script Sektion

---

## 📚 Referenzen

- **UStG §19:** Kleinunternehmer-Regelung
- **UStG §15:** Vorsteuerabzug
- **§14 UStG:** Rechnungsangaben (Brutto-Preise in Deutschland)

---

**Ende der Dokumentation**
