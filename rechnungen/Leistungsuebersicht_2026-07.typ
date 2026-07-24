// Leistungsübersicht zur Abstimmung · Trialog Makler Gruppe GmbH
// Build: typst compile Leistungsuebersicht_2026-07.typ

#let navy   = rgb("#1A2B4A")
#let accent = rgb("#4A7FC1")
#let ink    = rgb("#1A1A2E")
#let grey   = rgb("#4A5568")
#let line-c = rgb("#E8ECF2")
#let soft   = rgb("#F4F7FB")
#let green  = rgb("#2E7D32")
#let orange = rgb("#E65100")

#set document(title: "Leistungsübersicht Juli 2026 · Trialog Makler Gruppe GmbH")
#set page(paper: "a4", margin: (x: 18mm, top: 14mm, bottom: 14mm))
#set text(font: ("Helvetica Neue", "Helvetica", "Arial"), size: 9.5pt, fill: ink, lang: "de")
#set par(leading: 0.62em)

#let lbl(t) = text(7.5pt, weight: "bold", fill: accent, tracking: 0.8pt, upper(t))
#let head(t) = block(above: 11pt, below: 6pt)[
  #text(12pt, weight: "bold", fill: navy)[#t]
  #v(2pt)
  #line(length: 100%, stroke: 1pt + navy)
]
#let live = text(8pt, weight: "bold", fill: green)[im Einsatz]
#let bereit = text(8pt, weight: "bold", fill: orange)[bereit, nicht veröffentlicht]

// ---------------------------------------------------------------- Kopf
#grid(columns: (1fr, auto), align: (left + top, right + top),
  [
    #text(18pt, weight: "bold", fill: navy)[Leistungsübersicht]
    #v(2pt)
    #text(9pt, fill: grey)[Trialog Makler Gruppe GmbH · Alexander Knor]
  ],
  [#align(right)[
    #text(8.5pt, fill: grey)[Stand 23. Juli 2026] \
    #text(8.5pt, fill: grey)[Zeitraum seit 19.02.2026]
  ]],
)
#v(5pt)
#line(length: 100%, stroke: 2pt + navy)
#v(8pt)

#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 3pt, fill: soft)[
  #text(9pt, fill: grey)[
    Abstimmungsgrundlage, keine Rechnung. Sie zeigt, was seit der letzten Abrechnung umgesetzt
    wurde, was davon im Einsatz ist und was dafür berechnet würde. Festpreis je Modul.
  ]
]

// ---------------------------------------------------------------- Umgesetzt
#head("Umgesetzt seit Februar 2026")

#table(
  columns: (auto, 1fr, auto, auto),
  stroke: none,
  align: (left + top, left + top, left + top, right + top),
  inset: (x: 7pt, y: 5pt),
  fill: (_, row) => if row == 0 { navy } else if calc.even(row) { soft } else { white },
  table.header(
    text(8pt, weight: "bold", fill: white)[NR.],
    text(8pt, weight: "bold", fill: white)[LEISTUNG],
    text(8pt, weight: "bold", fill: white)[STATUS],
    text(8pt, weight: "bold", fill: white)[BETRAG],
  ),

  text(9pt, weight: "bold")[1],
  [#text(9.5pt, weight: "bold")[Abrechnung fertiggestellt] \
   #text(8.5pt, fill: grey)[Abrechnungen je Empfänger nachverfolgbar, Prüfung auf fehlende
   Mitarbeiterangaben vor dem Export, eigener Status für übertragene Abrechnungen,
   Qualifikationen nach Gewerbeordnung berücksichtigt]],
  live, text(9.5pt, weight: "bold")[220 EUR],

  text(9pt, weight: "bold")[2],
  [#text(9.5pt, weight: "bold")[Sonderfälle in Umsatz und Struktur] \
   #text(8.5pt, fill: grey)[Außerordentliche Umsätze mit Zuordnung zu einem anderen Mitarbeiter,
   Verschieben von Mitarbeitern im Organigramm mit Zulässigkeitsprüfung]],
  live, text(9.5pt, weight: "bold")[160 EUR],

  text(9pt, weight: "bold")[3],
  [#text(9.5pt, weight: "bold")[WIFO-Import überarbeitet] \
   #text(8.5pt, fill: grey)[Kennung je Importlauf, Rücknahme eines kompletten Imports, Import läuft
   ganz durch oder gar nicht, verbesserte Dublettenprüfung, Stornobuchungen werden gegengerechnet,
   acht zusätzliche Sparten zugeordnet]],
  bereit, text(9.5pt, weight: "bold")[255 EUR],

  text(9pt, weight: "bold")[4],
  [#text(9.5pt, weight: "bold")[Mitarbeiterportal nach Ihrer Intranet-Demo, erste Ausbaustufe] \
   #text(8.5pt, fill: grey)[Seitennavigation, Kopfzeile mit Begrüßung, Startseite mit Schnellzugriffen,
   Trialog Wiki, Akademie mit Videobibliothek und Einbindung von Loom, YouTube und Vimeo, Bereich für
   Marketingkampagnen, vier neue Datenbereiche mit Zugriffsschutz]],
  bereit, text(9.5pt, weight: "bold")[640 EUR],

  text(9pt, weight: "bold")[5],
  [#text(9.5pt, weight: "bold")[Umsatzsichten je Rolle] \
   #text(8.5pt, fill: grey)[Mitarbeiter sehen die eigenen Umsätze, Geschäftsführung schaltet
   zwischen Unternehmens- und Eigenansicht um, Zeitraumfilter über alle Ansichten]],
  bereit, text(9.5pt, weight: "bold")[110 EUR],

  text(9pt, weight: "bold")[6],
  [#text(9.5pt, weight: "bold")[Automatische Qualitätssicherung] \
   #text(8.5pt, fill: grey)[75 automatisierte Tests prüfen Rechen- und Importlogik bei jeder
   Änderung, zuvor gab es keine]],
  live, text(9.5pt, weight: "bold")[100 EUR],

  text(9pt, weight: "bold")[7],
  [#text(9.5pt, weight: "bold")[Bereitstellung und Betrieb] \
   #text(8.5pt, fill: grey)[Veröffentlichung, Zugriffsregeln, Datenbankindizes, laufende
   Fehlerbehebung]],
  live, text(9.5pt, weight: "bold")[65 EUR],
)

#v(6pt)
#block(width: 100%, inset: (x: 12pt, y: 8pt), radius: 3pt, fill: navy)[
  #grid(columns: (1fr, auto),
    [#text(10.5pt, weight: "bold", fill: white)[Summe umgesetzte Leistungen]],
    [#text(15pt, weight: "bold", fill: white)[1.550 EUR]],
  )
]

// ---------------------------------------------------------------- Gewährleistung
#head("Zusätzlich behoben, ohne Berechnung")

#table(
  columns: (1fr, auto),
  stroke: none,
  align: (left + top, right + top),
  inset: (x: 7pt, y: 6pt),
  fill: rgb("#E8F5E9"),
  [#text(9.5pt, weight: "bold")[Korrektur der Provisionsberechnung] \
   #text(8.5pt, fill: grey)[Bei Mitarbeitern ohne Umsatzsteuerpflicht wurde die Provision auf den
   Brutto- statt auf den Nettobetrag berechnet, die Auszahlungen fielen dadurch um 19 Prozent zu
   hoch aus. Korrigiert und durch Tests abgesichert. Bitte prüfen, ob bereits erstellte
   Abrechnungen betroffen sind.]],
  [#text(9.5pt, weight: "bold", fill: green)[0 EUR] \ #text(8pt, fill: grey)[Wert 160 EUR]],

  [#text(9.5pt, weight: "bold")[Sicherheitskorrektur bei Administratorrechten] \
   #text(8.5pt, fill: grey)[Die Rechteprüfung verglich E-Mail-Adressen nur teilweise, eine selbst
   registrierte Adresse hätte Administratorrechte erlangen können. Vergleich erfolgt jetzt exakt.]],
  [#text(9.5pt, weight: "bold", fill: green)[0 EUR] \ #text(8pt, fill: grey)[Wert 80 EUR]],
)

// ---------------------------------------------------------------- Offen
#pagebreak()

#text(18pt, weight: "bold", fill: navy)[Was noch offen ist]
#v(4pt)
#line(length: 100%, stroke: 2pt + navy)
#v(7pt)

#head("Vor der Übergabe")

#block(width: 100%, inset: (x: 10pt, y: 9pt), radius: 3pt, fill: rgb("#FFF3E0"),
       stroke: (left: 2.5pt + orange))[
  #text(9.5pt, weight: "bold", fill: navy)[Veröffentlichung der Module 3, 4 und 5]
  #v(3pt)
  #text(9pt, fill: grey)[
    Diese Module sind fertig, laufen aber noch nicht auf der Live-Adresse, letzter Stand ist der
    16.07.2026. Auch die beiden ohne Berechnung behobenen Fehler wirken erst danach, die
    Provisionsberechnung ist im laufenden Betrieb also noch nicht korrigiert. Vorschlag:
    Veröffentlichung, gemeinsame Abnahme, dann Abrechnung.
  ]
]

#head("Aus dem Zahlungsplan vom 19.02.2026")

#table(
  columns: (auto, 1fr, auto, auto),
  stroke: none,
  align: (left, left, left, right),
  inset: (x: 7pt, y: 5pt),
  fill: (_, row) => if calc.odd(row) { soft } else { white },
  text(8.5pt)[Meilenstein 1], text(8.5pt)[Anzahlung bei Projektstart],
    text(8.5pt, fill: green, weight: "bold")[bezahlt], text(8.5pt)[1.000 EUR],
  text(8.5pt)[Meilenstein 2], text(8.5pt)[Auslieferung im Produktivbetrieb],
    text(8.5pt, fill: green, weight: "bold")[bezahlt], text(8.5pt)[2.000 EUR],
  text(8.5pt, weight: "bold")[Meilenstein 3], text(8.5pt, weight: "bold")[Abnahme nach Fehlerbehebung],
    text(8.5pt, fill: orange, weight: "bold")[offen], text(8.5pt, weight: "bold")[1.000 EUR],
)

#head("Rest aus der Intranet-Demo")

#text(9pt, fill: grey)[
  Der wesentliche Teil ist mit Modul 4 bereits umgesetzt. Vom Rest der Demo bleiben zwei kleine
  Posten. Es entstehen keine neuen Berechnungen und keine neuen Dokumente, es werden nur Links
  abgelegt und vorhandene Ansichten auf der Übersicht verdrahtet.
]
#v(6pt)

#table(
  columns: (1fr, auto),
  stroke: none,
  align: (left + top, right + top),
  inset: (x: 7pt, y: 6pt),
  fill: (_, row) => if calc.odd(row) { soft } else { white },
  [#text(9pt, weight: "bold")[Tool- und Zugangsverlinkungen] \
   #text(8.5pt, fill: grey)[Ein Bereich, in dem beliebige Links abgelegt und in Kacheln angezeigt
   werden, Öffnen in einem neuen Tab. Deckt sowohl die externen Zugänge (blau direkt, Baufinex,
   eHyp, Europace, Forum Finanz, WIFO) als auch die Tools ab. Baut auf der bereits vorhandenen
   Linkverwaltung aus Modul 4 auf]], text(9pt)[150 EUR],
  [#text(9pt, weight: "bold")[Verdrahtung auf die Übersicht] \
   #text(8.5pt, fill: grey)[Bestenliste, Kennzahlen und Umsatzansicht werden auf der Startseite
   des Portals eingebunden. Alle Werte stammen aus der vorhandenen Berechnung, es kommt keine
   neue Logik hinzu]], text(9pt)[120 EUR],
  table.hline(stroke: 1pt + navy),
  [#text(9.5pt, weight: "bold")[Summe]], text(9.5pt, weight: "bold", fill: navy)[270 EUR],
)

#v(8pt)
#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 3pt, fill: soft, stroke: 0.5pt + line-c,
       breakable: false)[
  #text(9pt, weight: "bold", fill: navy)[Bewusst nicht vorgesehen]
  #v(3pt)
  #text(9pt, fill: grey)[
    Eigene Rechner und Dokumentgeneratoren, Karrieresystem mit Stufenmodell, Neuigkeiten, Termine,
    Geburtstage, Benachrichtigungen und Diagramme. Einstellungen und Profil bleiben wie bisher.
    Damit bleibt das Portal auf dem, was heute schon rechnet, und wird nur zugänglicher gemacht.
  ]
]
