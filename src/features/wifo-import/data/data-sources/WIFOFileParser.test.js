/**
 * Tests: WIFOFileParser (CSV path)
 * Encoding detection (Windows-1252 vs UTF-8), semicolon delimiter, German
 * number preservation and the column drift guard.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WIFOFileParser } from './WIFOFileParser.js';

const HEADER =
  'Datum;Vertrag;Sparte;Kunde Name;Kunde Vorname;Kunde Geburtsdatum;Firma;VP Name;VP Vorname;VP Geburtsdatum;Kfz;AP-VM;Art;Gesellschaft;Tarif;Basis;Satz;Brutto;Stornoreserve;RB;Netto;Vertrag ID;Lauf;Erstelldatum;';

function dataRow({
  datum = '01.05.2026',
  vertrag = '7836600',
  sparte = 'PKV',
  kundeName = 'Kilfitt',
  vermittler = 'Lippa, Daniel',
  art = 'BP',
  netto = '23,96',
  vertragId = '1265155',
  lauf = '100871',
} = {}) {
  return `${datum};${vertrag};${sparte};${kundeName};Sara;1995-05-24;;;;0000-00-00;;${vermittler};${art};Landeskrankenhilfe V.V.a.G.;Private Kranken-Zusatzvers.;30,24;AP 0.9;27,22;2,72;0,54;${netto};${vertragId};${lauf};18.06.2026;`;
}

function cp1252File(text, name = 'courtage.csv') {
  // Windows-1252 round trip: encode named German characters manually since
  // TextEncoder only produces UTF-8.
  const bytes = new Uint8Array([...text].map((char) => {
    const map = { 'ö': 0xf6, 'ä': 0xe4, 'ü': 0xfc, 'ß': 0xdf, 'Ö': 0xd6, 'Ä': 0xc4, 'Ü': 0xdc };
    return map[char] ?? char.charCodeAt(0);
  }));
  return new File([bytes], name, { type: 'text/csv' });
}

test('parses a Windows-1252 encoded WIFO CSV including umlauts', async () => {
  const csv = [HEADER, dataRow({ kundeName: 'Schörnick', vermittler: 'Kreß, Dungalmaa' })].join('\r\n');
  const parser = new WIFOFileParser();

  const records = await parser.parse(cp1252File(csv));

  assert.equal(records.length, 1);
  assert.equal(records[0].kundeNachname, 'Schörnick');
  assert.equal(records[0].vermittlerName, 'Kreß, Dungalmaa');
});

test('parses UTF-8 CSV as well', async () => {
  const csv = [HEADER, dataRow({ kundeName: 'Müller' })].join('\n');
  const file = new File([new TextEncoder().encode(csv)], 'utf8.csv');
  const parser = new WIFOFileParser();

  const records = await parser.parse(file);
  assert.equal(records[0].kundeNachname, 'Müller');
});

test('preserves German decimal amounts from raw text', async () => {
  const csv = [HEADER, dataRow({ netto: '1.234,56' }), dataRow({ netto: '-0,14' })].join('\n');
  const parser = new WIFOFileParser();

  const records = await parser.parse(cp1252File(csv));
  assert.equal(records[0].netto, 1234.56);
  assert.equal(records[1].netto, -0.14);
});

test('skips empty lines and tolerates a missing trailing separator on the last row', async () => {
  const lastRow = dataRow().slice(0, -1); // no trailing semicolon
  const csv = [HEADER, dataRow(), '', lastRow].join('\n');
  const parser = new WIFOFileParser();

  const records = await parser.parse(cp1252File(csv));
  assert.equal(records.length, 2);
  assert.equal(records[1].parseIssues.length, 0);
});

test('flags rows whose column count drifts from the header', async () => {
  const brokenRow = dataRow({ vermittler: 'Lippa; Daniel' }); // unescaped delimiter
  const csv = [HEADER, brokenRow].join('\n');
  const parser = new WIFOFileParser();

  const records = await parser.parse(cp1252File(csv));
  assert.equal(records.length, 1);
  assert.equal(records[0].parseIssues.length, 1);
  assert.match(records[0].parseIssues[0], /Spaltenanzahl/);
});

test('rejects files missing required columns', async () => {
  const csv = ['Datum;Irgendwas;', '01.05.2026;x;'].join('\n');
  const parser = new WIFOFileParser();

  await assert.rejects(parser.parse(cp1252File(csv)), /Pflicht-Spalten fehlen/);
});
