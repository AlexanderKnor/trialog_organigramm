/**
 * Tests: WIFOImportRecord
 * German number/date parsing from raw WIFO rows and the row fingerprint
 * used as sourceReference for duplicate detection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WIFOImportRecord } from './WIFOImportRecord.js';

const COLUMN_MAP = {
  'Datum': 0,
  'Vertrag': 1,
  'Sparte': 2,
  'AP-VM': 3,
  'Art': 4,
  'Basis': 5,
  'Brutto': 6,
  'Netto': 7,
  'Vertrag ID': 8,
  'Lauf': 9,
};

function buildRecord(overrides = {}) {
  const row = [
    overrides.datum ?? '01.05.2026',
    overrides.vertrag ?? '7836600',
    overrides.sparte ?? 'PKV',
    overrides.vermittler ?? 'Lippa, Daniel',
    overrides.art ?? 'AP',
    overrides.basis ?? '30,24',
    overrides.brutto ?? '27,22',
    overrides.netto ?? '23,96',
    overrides.vertragId ?? '1265155',
    overrides.lauf ?? '100872',
  ];
  return WIFOImportRecord.fromWIFORow(1, row, COLUMN_MAP);
}

test('parses German decimal comma', () => {
  assert.equal(buildRecord({ netto: '27,22' }).netto, 27.22);
});

test('parses German thousands separator with decimal comma', () => {
  assert.equal(buildRecord({ netto: '1.234,56' }).netto, 1234.56);
});

test('parses German thousands separator without decimal comma', () => {
  assert.equal(buildRecord({ netto: '1.234' }).netto, 1234);
});

test('parses negative amounts (Storno rows)', () => {
  assert.equal(buildRecord({ netto: '-0,14' }).netto, -0.14);
});

test('parses zero as zero, not null', () => {
  assert.equal(buildRecord({ netto: '0,00' }).netto, 0);
});

test('empty and dash amounts become null', () => {
  assert.equal(buildRecord({ netto: '' }).netto, null);
  assert.equal(buildRecord({ netto: '-' }).netto, null);
});

test('parses German date format', () => {
  const record = buildRecord({ datum: '01.05.2026' });
  assert.equal(record.datum.getFullYear(), 2026);
  assert.equal(record.datum.getMonth(), 4);
  assert.equal(record.datum.getDate(), 1);
});

test('WIFO null date 0000-00-00 becomes null', () => {
  assert.equal(buildRecord({ datum: '0000-00-00' }).datum, null);
});

test('fingerprint contains lauf, contract id, date, amount and type', () => {
  const record = buildRecord();
  assert.equal(record.fingerprint, 'wifo:100872:1265155:2026-05-01:23.96:AP');
});

test('fingerprint differs across settlement runs for the same contract', () => {
  // Recurring Bestandsprovision: next month repeats the contract but must
  // not collide with the previous run.
  const may = buildRecord({ art: 'BP', lauf: '100871', datum: '01.05.2026' });
  const june = buildRecord({ art: 'BP', lauf: '100999', datum: '01.06.2026' });
  assert.notEqual(may.fingerprint, june.fingerprint);
});

test('fingerprint is stable for identical input', () => {
  assert.equal(buildRecord().fingerprint, buildRecord().fingerprint);
});

test('JSON roundtrip preserves fields and parse issues', () => {
  const record = WIFOImportRecord.fromWIFORow(
    3,
    ['01.05.2026', 'V1', 'PKV', 'Lippa, Daniel', 'BP', '1,00', '0,10', '0,08', '99', '100871'],
    COLUMN_MAP,
    ['Spaltenanzahl weicht ab']
  );

  const restored = WIFOImportRecord.fromJSON(record.toJSON());
  assert.equal(restored.netto, 0.08);
  assert.equal(restored.vertragId, '99');
  assert.deepEqual(restored.parseIssues, ['Spaltenanzahl weicht ab']);
  assert.equal(restored.fingerprint, record.fingerprint);
});
