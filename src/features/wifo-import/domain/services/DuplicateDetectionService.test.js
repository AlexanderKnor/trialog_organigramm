/**
 * Tests: DuplicateDetectionService
 * The critical property: recurring Bestandsprovisionen (same contract, new
 * settlement run) must NOT be flagged, while re-imports of the same rows must.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DuplicateDetectionService } from './DuplicateDetectionService.js';

function existingEntry(overrides = {}) {
  return {
    id: 'existing-1',
    employeeId: 'emp1',
    contractNumber: '7836600',
    sourceReference: 'wifo:100871:1265155:2026-05-01:27.22:BP',
    provisionAmount: 27.22,
    entryDate: '2026-05-01T00:00:00.000Z',
    customerName: 'Sara Kilfitt',
    source: 'wifo_import',
    ...overrides,
  };
}

function record(overrides = {}) {
  return {
    vertrag: '7836600',
    vertragId: '1265155',
    datum: new Date(2026, 4, 1),
    netto: 27.22,
    art: 'BP',
    fingerprint: 'wifo:100871:1265155:2026-05-01:27.22:BP',
    kundeName: 'Sara Kilfitt',
    kundeVorname: 'Sara',
    mappedEmployeeId: 'emp1',
    ...overrides,
  };
}

function buildService(entries) {
  const service = new DuplicateDetectionService();
  service.buildIndex(entries);
  return service;
}

test('re-importing the same WIFO row is an exact duplicate', () => {
  const service = buildService([existingEntry()]);
  const result = service.checkDuplicate(record());

  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateType, 'exact_import');
});

test('fingerprint match is employee-independent (remapped agent cannot hide a re-import)', () => {
  const service = buildService([existingEntry()]);
  const result = service.checkDuplicate(record({ mappedEmployeeId: 'someone-else' }));

  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateType, 'exact_import');
});

test('recurring BP in the next settlement run is NOT a duplicate', () => {
  const service = buildService([existingEntry()]);
  const nextMonth = record({
    datum: new Date(2026, 5, 1),
    netto: 27.8,
    fingerprint: 'wifo:100999:1265155:2026-06-01:27.80:BP',
  });

  const result = service.checkDuplicate(nextMonth);
  assert.equal(result.isDuplicate, false);
  assert.equal(result.duplicateType, null);
});

test('legacy entry without fingerprint: contract + date + amount is a duplicate', () => {
  const legacy = existingEntry({ sourceReference: '7836600' });
  const service = buildService([legacy]);

  const result = service.checkDuplicate(record());
  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateType, 'contract_date_amount');
});

test('same date + amount + customer without contract match is a duplicate', () => {
  const manual = existingEntry({
    contractNumber: 'MANUELL-1',
    sourceReference: null,
  });
  const service = buildService([manual]);

  const result = service.checkDuplicate(
    record({ vertrag: 'ANDERE-NUMMER', vertragId: null, fingerprint: 'wifo:x' })
  );
  assert.equal(result.isDuplicate, true);
  assert.equal(result.duplicateType, 'amount_date_match');
});

test('same date + amount but different customer is only a potential duplicate', () => {
  const other = existingEntry({
    contractNumber: 'MANUELL-1',
    sourceReference: null,
    customerName: 'Ganz Anderer Kunde',
  });
  const service = buildService([other]);

  const result = service.checkDuplicate(
    record({ vertrag: 'ANDERE-NUMMER', vertragId: null, fingerprint: 'wifo:x' })
  );
  assert.equal(result.isDuplicate, false);
  assert.equal(result.duplicateType, 'potential_duplicate');
});

test('repeated Abschlussprovision for a known contract is flagged as warning case', () => {
  const service = buildService([existingEntry()]);
  const apRepeat = record({
    art: 'AP',
    datum: new Date(2026, 6, 1),
    netto: 99.99,
    fingerprint: 'wifo:101000:1265155:2026-07-01:99.99:AP',
  });

  const result = service.checkDuplicate(apRepeat);
  assert.equal(result.isDuplicate, false);
  assert.equal(result.duplicateType, 'repeated_initial_commission');
});

test('finds identical rows within one file', () => {
  const rowA = record();
  const rowB = record();
  rowA.vermittlerName = 'Lippa, Daniel';
  rowB.vermittlerName = 'Lippa, Daniel';

  const service = new DuplicateDetectionService();
  const groups = service.findInternalDuplicates([rowA, rowB]);

  assert.equal(groups.size, 1);
  assert.deepEqual([...groups.values()][0], [0, 1]);
});
