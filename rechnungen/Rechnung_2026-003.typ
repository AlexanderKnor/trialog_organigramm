// Rechnung 2026-003 · Trialog Makler Gruppe GmbH
// Build: typst compile Rechnung_2026-003.typ

#let navy    = rgb("#1A2B4A")
#let navy2   = rgb("#2D4A7A")
#let accent  = rgb("#4A7FC1")
#let ink     = rgb("#1A1A2E")
#let grey    = rgb("#4A5568")
#let line-c  = rgb("#E8ECF2")
#let soft    = rgb("#F4F7FB")
#let green   = rgb("#2E7D32")
#let greenbg = rgb("#E8F5E9")
#let orange  = rgb("#E65100")
#let orangebg = rgb("#FFF3E0")

// ---- HIER AUSFÜLLEN -------------------------------------------------------
#let absender = (
  name:    "Alexander Knor",
  strasse: "«Straße Hausnummer»",
  ort:     "«PLZ Ort»",
  mail:    "«E-Mail-Adresse»",
  tel:     "«Telefonnummer»",
  steuernr: "«Steuernummer»",
)
#let kunde = (
  name:    "Trialog Makler Gruppe GmbH",
  strasse: "«Straße Hausnummer»",
  ort:     "«PLZ Ort»",
)
#let zahlungsziel = "14 Tage"
// ---------------------------------------------------------------------------

#set document(title: "Rechnung 2026-003 · Trialog Makler Gruppe GmbH", author: absender.name)
#set page(
  paper: "a4",
  margin: (x: 18mm, top: 13mm, bottom: 13mm),
  footer: context [
    #set text(7.5pt, fill: grey)
    #line(length: 100%, stroke: 0.5pt + line-c)
    #v(2pt)
    #grid(columns: (1fr, auto),
      [#absender.name · Rechnung 2026-003 vom 23. Juli 2026],
      [Seite #counter(page).display() von #counter(page).final().first()])
  ],
)
#set text(font: ("Helvetica Neue", "Helvetica", "Arial"), size: 9.5pt, fill: ink, lang: "de")
#set par(justify: false, leading: 0.62em)

// ---------- Bausteine ----------
#let label-txt(t) = text(7.5pt, weight: "bold", fill: accent, tracking: 0.8pt, upper(t))

#let sektion(t) = block(width: 100%, above: 12pt, below: 7pt)[
  #text(9pt, weight: "bold", fill: navy, tracking: 1pt, upper(t))
  #v(3pt)
  #line(length: 100%, stroke: 1pt + navy)
]

#let posbox(nr, titel, beschreibung, betrag) = block(
  width: 100%, inset: (x: 10pt, y: 7pt), radius: 3pt, fill: soft, above: 5pt,
  stroke: (left: 2.5pt + accent),
)[
  #grid(columns: (1fr, auto), column-gutter: 12pt,
    [
      #text(8pt, weight: "bold", fill: accent)[POSITION #nr]
      #v(2pt)
      #text(10.5pt, weight: "bold", fill: navy)[#titel]
      #v(4pt)
      #text(9pt, fill: grey)[#beschreibung]
    ],
    [#align(right + top)[#text(12pt, weight: "bold", fill: navy)[#betrag]]],
  )
]

// ==========================================================================
// SEITE 1 · RECHNUNG
// ==========================================================================

#grid(columns: (1fr, auto), align: (left + top, right + top),
  [
    #text(15pt, weight: "bold", fill: navy)[#absender.name]
    #v(1pt)
    #text(8.5pt, fill: grey)[Softwareentwicklung & Webapplikationen]
  ],
  [
    #text(26pt, weight: "bold", fill: navy)[RECHNUNG]
    #v(-2pt)
    #text(9pt, fill: accent, weight: "bold")[Nr. 2026-003]
  ],
)

#v(4pt)
#line(length: 100%, stroke: 2pt + navy)
#v(9pt)

#grid(columns: (1.25fr, 1fr), column-gutter: 18pt,
  [
    #label-txt("Rechnungsempfänger")
    #v(4pt)
    #text(10.5pt, weight: "bold")[#kunde.name] \
    #text(9pt, fill: grey)[#kunde.strasse \ #kunde.ort]
  ],
  [
    #label-txt("Rechnungssteller")
    #v(4pt)
    #text(9pt)[
      #absender.name \
      #absender.strasse \
      #absender.ort \
      #absender.mail · #absender.tel \
      Steuernummer: #absender.steuernr
    ]
  ],
)

#v(10pt)
#block(width: 100%, inset: (x: 10pt, y: 7pt), radius: 3pt, fill: soft)[
  #grid(columns: (1fr, 1fr, 1.4fr), column-gutter: 10pt,
    [#label-txt("Rechnungsdatum") \ #v(2pt) #text(9.5pt)[23. Juli 2026]],
    [#label-txt("Zahlungsziel") \ #v(2pt) #text(9.5pt)[#zahlungsziel]],
    [#label-txt("Leistungszeitraum") \ #v(2pt) #text(9.5pt)[20.02.2026 bis 23.07.2026]],
  )
]

#v(9pt)
#text(9.5pt, fill: grey)[
  Weiterentwicklung Ihres Verwaltungstools seit der letzten Rechnung sowie Abschluss des vereinbarten
  Zahlungsplans. Jede Position ist in der Anlage ab Seite 2 ausführlich erläutert.
]

#sektion("Rechnungspositionen")

#posbox(
  "01",
  "Erweiterungspaket: neue Funktionen seit Februar 2026",
  [Sieben abgeschlossene Arbeitspakete: Abrechnung fertiggestellt, Sonderfälle in Umsatz und Struktur,
   WIFO-Import überarbeitet, Mitarbeiterportal nach Ihrer Intranet-Demo (erste Ausbaustufe),
   Umsatzsichten je Rolle, automatische Qualitätssicherung, Bereitstellung und Betrieb.],
  "1.550,00 EUR",
)

#posbox(
  "02",
  "Meilenstein 3 aus dem Zahlungsplan vom 19.02.2026",
  [Abschluss des Erstprojekts nach der Fehlerbehebungsphase. Alle gemeldeten und alle bei der
   eigenen Prüfung gefundenen Fehler sind behoben, siehe Position 03.],
  "1.000,00 EUR",
)

#block(
  width: 100%, inset: (x: 10pt, y: 7pt), radius: 3pt, fill: greenbg, above: 5pt,
  stroke: (left: 2.5pt + green),
)[
  #grid(columns: (1fr, auto), column-gutter: 12pt,
    [
      #text(8pt, weight: "bold", fill: green)[POSITION 03 · OHNE BERECHNUNG]
      #v(2pt)
      #text(10.5pt, weight: "bold", fill: navy)[Fehlerbehebung im Rahmen der Gewährleistung]
      #v(4pt)
      #text(9pt, fill: grey)[
        Korrektur der Provisionsberechnung bei nicht umsatzsteuerpflichtigen Mitarbeitern und
        Schließen einer Sicherheitslücke bei den Administratorrechten. Betrifft bereits gelieferte
        Funktionen, wird nicht berechnet. Gegenwert 240,00 EUR, Details Seite 3.
      ]
    ],
    [#align(right + top)[#text(12pt, weight: "bold", fill: green)[0,00 EUR]]],
  )
]

#v(7pt)
#block(width: 100%, inset: (x: 12pt, y: 9pt), radius: 3pt, fill: navy)[
  #grid(columns: (1fr, auto),
    [#text(11pt, weight: "bold", fill: white)[Rechnungsbetrag]],
    [#text(17pt, weight: "bold", fill: white)[2.550,00 EUR]],
  )
]

#v(4pt)
#text(8.5pt, fill: grey)[
  Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
]

#v(7pt)
#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 3pt, fill: soft, stroke: 0.5pt + line-c, breakable: false)[
  #label-txt("Zahlungsanweisung")
  #v(4pt)
  #grid(columns: (1fr, 1fr), column-gutter: 14pt,
    [
      #text(9pt)[
        *Kontoinhaber:* #absender.name \
        *IBAN:* DE33 4785 3520 0002 7255 96 \
        *BIC:* WELADED1WDB
      ]
    ],
    [
      #text(9pt)[
        *Bank:* Kreissparkasse Halle-Wiedenbrück \
        *Verwendungszweck:* Trialog 2026-003 \
        *Betrag:* 2.550,00 EUR
      ]
    ],
  )
]

// ==========================================================================
// SEITE 2 · ANLAGE, NEUE LEISTUNGEN
// ==========================================================================
#pagebreak()

#text(8pt, fill: grey)[Anlage zur Rechnung 2026-003 · Trialog Makler Gruppe GmbH]
#v(2pt)
#text(17pt, weight: "bold", fill: navy)[Was neu dazugekommen ist]
#v(3pt)
#line(length: 100%, stroke: 2pt + navy)
#v(8pt)

#text(9.5pt, fill: grey)[
  Alle Positionen sind fertiggestellt und im System vorhanden. Festpreis je Arbeitspaket, keine Abrechnung nach Zeit.
]

#v(6pt)

#let leistung(titel, beschreibung, betrag) = block(width: 100%, above: 9pt, breakable: false)[
  #grid(columns: (1fr, auto), column-gutter: 12pt,
    [#text(10.5pt, weight: "bold", fill: navy)[#titel]],
    [#text(10.5pt, weight: "bold", fill: navy2)[#betrag]],
  )
  #v(3pt)
  #text(9pt, fill: grey)[#beschreibung]
  #v(5pt)
  #line(length: 100%, stroke: 0.5pt + line-c)
]

#leistung(
  "Abrechnung fertiggestellt",
  [Provisionsabrechnungen lassen sich je Empfänger nachverfolgen. Vor dem Export prüft das System,
   ob alle nötigen Angaben eines Mitarbeiters vorliegen, und meldet fehlende Daten, bevor ein
   fehlerhaftes Dokument entsteht. Übertragene Abrechnungen erhalten einen eigenen Status, damit
   nichts doppelt ausgezahlt wird. Die Qualifikationen nach Gewerbeordnung werden berücksichtigt,
   sodass nur zulässige Umsätze einfließen.],
  "220,00 EUR",
)

#leistung(
  "Sonderfälle in Umsatz und Struktur",
  [Außerordentliche Umsätze können erfasst und einem anderen Mitarbeiter zugeordnet werden, mit
   eigener Behandlung in der Provisionskaskade. Mitarbeiter lassen sich innerhalb des
   Organigramms verschieben, einschließlich Prüfung, ob der Umzug zulässig ist.],
  "160,00 EUR",
)

#leistung(
  "WIFO-Import überarbeitet",
  [Jeder Importlauf erhält eine eigene Kennung und kann im Ganzen rückgängig gemacht werden. Ein
   Import läuft entweder vollständig durch oder gar nicht, sodass keine halben Datenstände mehr
   entstehen. Die Dublettenprüfung erkennt echte Doppelerfassungen zuverlässig, blockiert aber
   keine regulär wiederkehrenden Bestandsprovisionen mehr. Stornobuchungen werden gegengerechnet
   statt ausgeklammert, acht zusätzliche Sparten automatisch zugeordnet. Geprüft gegen eine echte
   Abrechnungsdatei mit 228 Datensätzen.],
  "255,00 EUR",
)

#leistung(
  "Mitarbeiterportal nach Ihrer Intranet-Demo, erste Ausbaustufe",
  [Umsetzung des Grundgerüsts aus der von Ihnen übergebenen Demo: Seitennavigation, Kopfzeile mit
   Begrüßung, Startseite mit Schnellzugriffen, Trialog Wiki mit Artikelverwaltung, Akademie mit
   Videobibliothek und Einbindung von Loom, YouTube und Vimeo sowie ein Bereich für
   Marketingkampagnen. Vier neue Datenbereiche mit Zugriffsschutz, Pflege durch die Administration.],
  "640,00 EUR",
)

#leistung(
  "Umsatzsichten je Rolle",
  [Mitarbeiter sehen ihre eigenen Umsätze, die Geschäftsführung kann zwischen Unternehmens- und
   Eigenansicht umschalten, die Administration sieht die vollständige Kaskade. Zeitraumfilter
   über alle Ansichten hinweg.],
  "110,00 EUR",
)

#leistung(
  "Automatische Qualitätssicherung",
  [75 automatisierte Tests prüfen die Rechen- und Importlogik bei jeder Änderung. Damit fallen
   Fehler in der Provisionsberechnung künftig sofort auf, statt erst in einer Abrechnung.
   Zuvor gab es keine automatisierten Tests.],
  "100,00 EUR",
)

#leistung(
  "Bereitstellung und Betrieb",
  [Veröffentlichung der Änderungen, Zugriffsregeln für die neuen Datenbereiche,
   Datenbankindizes und laufende Fehlerbehebung im produktiven Betrieb.],
  "65,00 EUR",
)

#v(7pt)
#block(width: 100%, inset: (x: 12pt, y: 9pt), radius: 3pt, fill: navy)[
  #grid(columns: (1fr, auto),
    [#text(10.5pt, weight: "bold", fill: white)[Summe Erweiterungspaket, Position 01]],
    [#text(14pt, weight: "bold", fill: white)[1.550,00 EUR]],
  )
]

// ==========================================================================
// SEITE 3 · ANLAGE, GEWÄHRLEISTUNG UND NACHVOLLZIEHBARKEIT
// ==========================================================================
#pagebreak()

#text(8pt, fill: grey)[Anlage zur Rechnung 2026-003 · Trialog Makler Gruppe GmbH]
#v(2pt)
#text(15pt, weight: "bold", fill: navy)[Ohne Berechnung behoben]
#v(3pt)
#line(length: 100%, stroke: 2pt + navy)
#v(8pt)

#text(9.5pt, fill: grey)[
  Beide Punkte betreffen bereits gelieferte Funktionen, wurden bei einer eigenen Überprüfung gefunden
  und behoben und Ihnen nicht berechnet.
]

#v(6pt)

#let gewaehr(titel, beschreibung, wert) = block(
  width: 100%, inset: (x: 10pt, y: 8pt), radius: 3pt, fill: greenbg, above: 6pt,
  stroke: (left: 2.5pt + green), breakable: false,
)[
  #grid(columns: (1fr, auto), column-gutter: 12pt,
    [
      #text(10.5pt, weight: "bold", fill: navy)[#titel]
      #v(4pt)
      #text(9pt, fill: grey)[#beschreibung]
    ],
    [#align(right + top)[
      #text(11pt, weight: "bold", fill: green)[0,00 EUR] \
      #v(1pt)
      #text(7.5pt, fill: grey)[Wert #wert]
    ]],
  )
]

#gewaehr(
  "Korrektur der Provisionsberechnung",
  [Bei Mitarbeitern ohne Umsatzsteuerpflicht wurde die Provision bisher auf den Bruttobetrag
   statt auf den Nettobetrag berechnet. Dadurch fielen die Auszahlungen um 19 Prozent zu hoch
   aus. Die Berechnung ist korrigiert und durch Tests abgesichert. Zusätzlich wurde die Rundung
   von Geldbeträgen vereinheitlicht und ein Berechnungsfehler in der Unternehmensübersicht des
   Organigramms behoben, der Zwischenebenen dem Unternehmen zugerechnet hatte.

   #text(weight: "bold")[Bitte prüfen Sie, ob in der Vergangenheit erstellte Abrechnungen
   hiervon betroffen sind.] Ich unterstütze Sie bei der Ermittlung, ohne Berechnung.],
  "160,00 EUR",
)

#gewaehr(
  "Sicherheitskorrektur bei Administratorrechten",
  [Die Prüfung der Administratorrechte verglich E-Mail-Adressen nur teilweise. Eine selbst
   registrierte Adresse, die eine Administratoradresse als Bestandteil enthält, hätte dadurch
   Administratorrechte erlangen können. Der Vergleich erfolgt jetzt exakt, an allen drei
   Stellen im System.],
  "80,00 EUR",
)

#v(11pt)
#text(15pt, weight: "bold", fill: navy)[Nachvollziehbarkeit]
#v(3pt)
#line(length: 100%, stroke: 2pt + navy)
#v(8pt)

#text(9.5pt, fill: grey)[
  Vergleich zum Stand der letzten Rechnung. Der vollständige Änderungsverlauf ist jederzeit einsehbar.
]

#v(6pt)

#table(
  columns: (1fr, auto),
  stroke: none,
  inset: (x: 8pt, y: 5pt),
  fill: (_, row) => if calc.odd(row) { soft } else { white },
  text(9pt)[Zeitraum seit der letzten Rechnung], text(9pt, weight: "bold")[5 Monate],
  text(9pt)[Bestehende Programmdateien überarbeitet], text(9pt, weight: "bold")[93],
  text(9pt)[Neue Programmzeilen für das Mitarbeiterportal], text(9pt, weight: "bold")[rund 9.400],
  text(9pt)[Ergänzte Programmzeilen im bestehenden System], text(9pt, weight: "bold")[rund 6.200],
  text(9pt)[Neue Datenbereiche mit Zugriffsschutz], text(9pt, weight: "bold")[4],
  text(9pt)[Automatisierte Tests, zuvor keine], text(9pt, weight: "bold")[75],
  text(9pt)[Behobene Fehler ohne Berechnung], text(9pt, weight: "bold")[2],
)

#v(11pt)
#label-txt("Gesamtübersicht Projekt")
#v(4pt)

#table(
  columns: (auto, 1fr, auto, auto),
  stroke: none,
  inset: (x: 7pt, y: 5pt),
  fill: (_, row) => if row == 0 { navy } else if calc.odd(row) { soft } else { white },
  table.header(
    text(8pt, weight: "bold", fill: white)[NR.],
    text(8pt, weight: "bold", fill: white)[LEISTUNG],
    text(8pt, weight: "bold", fill: white)[BETRAG],
    text(8pt, weight: "bold", fill: white)[STATUS],
  ),
  text(8.5pt)[2026-001], text(8.5pt)[Anzahlung bei Projektstart], text(8.5pt)[1.000,00 EUR],
    text(8.5pt, fill: green, weight: "bold")[bezahlt],
  text(8.5pt)[2026-002], text(8.5pt)[Auslieferung im Produktivbetrieb], text(8.5pt)[2.000,00 EUR],
    text(8.5pt, fill: green, weight: "bold")[bezahlt],
  text(8.5pt, weight: "bold")[2026-003], text(8.5pt, weight: "bold")[Erweiterungspaket seit Februar 2026],
    text(8.5pt, weight: "bold")[1.550,00 EUR], text(8.5pt, fill: orange, weight: "bold")[diese Rechnung],
  text(8.5pt, weight: "bold")[2026-003], text(8.5pt, weight: "bold")[Meilenstein 3, Projektabschluss],
    text(8.5pt, weight: "bold")[1.000,00 EUR], text(8.5pt, fill: orange, weight: "bold")[diese Rechnung],
  table.hline(stroke: 1pt + navy),
  text(9pt, weight: "bold")[], text(9pt, weight: "bold")[Gesamtvolumen Projekt bis heute],
    text(9pt, weight: "bold", fill: navy)[5.550,00 EUR], text(8.5pt)[],
)

#v(9pt)
#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 3pt, fill: soft, stroke: 0.5pt + line-c, breakable: false)[
  #text(10pt, weight: "bold", fill: navy)[Wie es weitergeht]
  #v(3pt)
  #text(9pt, fill: grey)[
    Ihre Intranet-Demo beschreibt zehn Bereiche. Grundgerüst und drei davon sind mit dieser Rechnung
    umgesetzt. Für die verbleibenden Bereiche, insbesondere Karrieresystem und Dokumentgeneratoren,
    erhalten Sie ein separates Angebot mit einzeln beauftragbaren Paketen.
    Vielen Dank für die Zusammenarbeit.
  ]
]
