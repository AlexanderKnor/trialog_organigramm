/**
 * Tests: RevenueService.addEntriesBulk / rollbackImportBatch
 * Race-free customer numbers, per-record failures without writes, and
 * rollback by import batch id. Uses Geschaeftsfuehrer employees so the
 * provision snapshot path needs no hierarchy tree.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RevenueService } from './RevenueService.js';
import { GESCHAEFTSFUEHRER_IDS } from '../../../../core/config/geschaeftsfuehrer.config.js';

const [GF_A, GF_B] = GESCHAEFTSFUEHRER_IDS;

function entryData(overrides = {}) {
  return {
    category: 'insurance',
    provisionType: 'insurance',
    customerName: 'Test Kunde',
    provisionAmount: 100,
    contractNumber: 'V-1',
    entryDate: new Date(2026, 4, 1),
    status: 'provisioned',
    product: { name: 'Tarif', category: 'insurance' },
    productProvider: { name: 'Gesellschaft', category: 'insurance' },
    source: 'wifo_import',
    sourceReference: 'wifo:100871:1:2026-05-01:100.00:BP',
    importBatchId: 'wifo-20260717-120000-abcd',
    ...overrides,
  };
}

function stubRepository({ maxCustomerNumbers = {}, failSave = false } = {}) {
  const calls = { getNextCustomerNumber: [], saveMany: [], deleteMany: [] };
  let stored = [];

  return {
    calls,
    get stored() {
      return stored;
    },
    async getNextCustomerNumber(employeeId) {
      calls.getNextCustomerNumber.push(employeeId);
      return (maxCustomerNumbers[employeeId] ?? 0) + 1;
    },
    async saveMany(entries) {
      if (failSave) {
        throw new Error('write failed');
      }
      calls.saveMany.push(entries);
      stored = [...stored, ...entries];
      return entries;
    },
    async findByImportBatchId(importBatchId) {
      return stored.filter((entry) => entry.importBatchId === importBatchId);
    },
    async deleteMany(entryIds) {
      calls.deleteMany.push(entryIds);
      stored = stored.filter((entry) => !entryIds.includes(entry.id));
    },
  };
}

test('assigns sequential customer numbers per employee with one query each', async () => {
  const repository = stubRepository({ maxCustomerNumbers: { [GF_A]: 41 } });
  const service = new RevenueService(repository, {});

  const { created, failures } = await service.addEntriesBulk([
    { employeeId: GF_A, entryData: entryData() },
    { employeeId: GF_A, entryData: entryData({ contractNumber: 'V-2' }) },
    { employeeId: GF_B, entryData: entryData({ contractNumber: 'V-3' }) },
    { employeeId: GF_A, entryData: entryData({ contractNumber: 'V-4' }) },
  ]);

  assert.equal(failures.length, 0);
  assert.equal(created.length, 4);

  const numbersA = created
    .filter(({ entry }) => entry.employeeId === GF_A)
    .map(({ entry }) => entry.customerNumber);
  assert.deepEqual(numbersA, [42, 43, 44]);

  const numbersB = created
    .filter(({ entry }) => entry.employeeId === GF_B)
    .map(({ entry }) => entry.customerNumber);
  assert.deepEqual(numbersB, [1]);

  // One max-query per employee, not one per entry (the per-entry read races).
  assert.deepEqual(repository.calls.getNextCustomerNumber.sort(), [GF_A, GF_B].sort());
  assert.equal(repository.calls.saveMany.length, 1);
});

test('invalid rows become failures and never reach the repository', async () => {
  const repository = stubRepository();
  const service = new RevenueService(repository, {});

  const { created, failures } = await service.addEntriesBulk([
    { employeeId: GF_A, entryData: entryData() },
    { employeeId: GF_A, entryData: entryData({ provisionAmount: 'keine Zahl' }) },
  ]);

  assert.equal(created.length, 1);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].index, 1);
  assert.equal(repository.stored.length, 1);
});

test('created entries carry import identity for later rollback', async () => {
  const repository = stubRepository();
  const service = new RevenueService(repository, {});

  const { created } = await service.addEntriesBulk([
    { employeeId: GF_A, entryData: entryData() },
  ]);

  const entry = created[0].entry;
  assert.equal(entry.source, 'wifo_import');
  assert.equal(entry.importBatchId, 'wifo-20260717-120000-abcd');
  assert.equal(entry.sourceReference, 'wifo:100871:1:2026-05-01:100.00:BP');
  assert.equal(entry.toJSON().importBatchId, 'wifo-20260717-120000-abcd');
});

test('a failing bulk write surfaces as an error', async () => {
  const repository = stubRepository({ failSave: true });
  const service = new RevenueService(repository, {});

  await assert.rejects(
    service.addEntriesBulk([{ employeeId: GF_A, entryData: entryData() }]),
    /write failed/
  );
});

test('rollbackImportBatch deletes exactly the entries of one import run', async () => {
  const repository = stubRepository();
  const service = new RevenueService(repository, {});

  await service.addEntriesBulk([
    { employeeId: GF_A, entryData: entryData() },
    { employeeId: GF_A, entryData: entryData({ importBatchId: 'wifo-other-run' }) },
  ]);

  const deletedCount = await service.rollbackImportBatch('wifo-20260717-120000-abcd');

  assert.equal(deletedCount, 1);
  assert.equal(repository.stored.length, 1);
  assert.equal(repository.stored[0].importBatchId, 'wifo-other-run');
});

test('rollback of an unknown batch id deletes nothing', async () => {
  const repository = stubRepository();
  const service = new RevenueService(repository, {});

  const deletedCount = await service.rollbackImportBatch('wifo-gibt-es-nicht');
  assert.equal(deletedCount, 0);
  assert.equal(repository.calls.deleteMany.length, 0);
});
