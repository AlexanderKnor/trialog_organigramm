/**
 * Tests: WIFOImportBatch
 * Batch identity (readable import id), import gating and rollback state.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WIFOImportBatch } from './WIFOImportBatch.js';
import { WIFOImportRecord } from './WIFOImportRecord.js';
import { RECORD_VALIDATION_STATUS } from '../value-objects/RecordValidationStatus.js';

function recordWithStatus(status) {
  const record = new WIFOImportRecord({ rowNumber: 1, rawData: [] });
  record.setValidationResult(status);
  return record;
}

function batchWith(records) {
  const batch = WIFOImportBatch.create({
    fileName: 'test.csv',
    fileSize: 100,
    uploadedBy: 'admin@example.com',
  });
  batch.startParsing();
  batch.setRecords(records);
  batch.startValidating();
  batch.finishValidation();
  return batch;
}

test('batch id is a readable, time-sortable import id', () => {
  const batch = WIFOImportBatch.create({ fileName: 'x.csv', fileSize: 1, uploadedBy: null });
  assert.match(batch.id, /^wifo-\d{8}-\d{6}-[0-9a-f]{4}$/);
});

test('a batch with only warning records is importable', () => {
  const batch = batchWith([recordWithStatus(RECORD_VALIDATION_STATUS.WARNING)]);
  assert.equal(batch.canImport, true);
  assert.equal(batch.importableRecords, 1);
});

test('a batch with only invalid records is not importable', () => {
  const batch = batchWith([recordWithStatus(RECORD_VALIDATION_STATUS.INVALID)]);
  assert.equal(batch.canImport, false);
});

test('markRolledBack sets the rolled back status', () => {
  const batch = batchWith([recordWithStatus(RECORD_VALIDATION_STATUS.VALID)]);
  batch.markRolledBack();
  assert.equal(batch.statusValue, 'rolledBack');
  assert.equal(batch.statusDisplayName, 'Rückgängig gemacht');
});

test('JSON roundtrip restores batch and records', () => {
  const batch = batchWith([
    recordWithStatus(RECORD_VALIDATION_STATUS.VALID),
    recordWithStatus(RECORD_VALIDATION_STATUS.WARNING),
  ]);

  const restored = WIFOImportBatch.fromJSON(batch.toJSON());
  assert.equal(restored.id, batch.id);
  assert.equal(restored.recordCount, 2);
  assert.equal(restored.statusValue, batch.statusValue);
  assert.equal(restored.canImport, true);
});
