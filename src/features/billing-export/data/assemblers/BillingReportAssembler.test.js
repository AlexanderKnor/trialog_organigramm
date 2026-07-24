import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BillingReportAssembler } from './BillingReportAssembler.js';

// Ground truth from VAT_IMPLEMENTATION_GUIDE.md test cases:
// net revenue 1000, gross 1190 (19% VAT), owner provision 50%.
//  - VAT-liable owner   -> keeps 500 net, invoices 595 gross (95 VAT remitted)
//  - VAT-exempt owner   -> gets 500, no VAT (cannot charge or offset it)
function makeEntry() {
  return {
    id: 'entry-1',
    entryDate: new Date('2026-01-15'),
    customerName: 'Muster GmbH',
    customerAddress: null,
    category: 'insurance',
    product: null,
    productProvider: null,
    contractNumber: '',
    netAmount: 1000,
    grossAmount: 1190,
    provisionAmount: 1000,
    hasVAT: true,
    vatRate: 19,
    vatAmount: 190,
    hasProvisionSnapshot: true,
    ownerProvisionSnapshot: 50,
    status: 'SUBMITTED',
  };
}

const vatLiable = { isVatExempt: false, getProvisionRate: () => 50 };
const vatExempt = { isVatExempt: true, getProvisionRate: () => 50 };

test('own line item: VAT-liable owner keeps 500 net, 595 gross', () => {
  const item = BillingReportAssembler.createOwnLineItem(makeEntry(), vatLiable);
  assert.equal(item.provisionGrossAmount, 595);
  assert.equal(item.provisionVatAmount, 95);
  assert.equal(item.provisionNetAmount, 500);
});

test('own line item: VAT-exempt owner gets 500, no VAT (regression: was 595)', () => {
  const item = BillingReportAssembler.createOwnLineItem(makeEntry(), vatExempt);
  assert.equal(item.provisionAmount, 500);
  assert.equal(item.provisionVatAmount, 0);
  assert.equal(item.provisionNetAmount, 500);
});

function makeHierarchyEntry() {
  const entry = makeEntry();
  return {
    originalEntry: entry,
    managerProvisionPercentage: 20, // delta above the owner
    managerProvisionAmount: 238, // pre-computed on gross: 1190 * 20%
    owner: { id: 'owner-1', name: 'Owner' },
  };
}

test('hierarchy line item: VAT-liable manager keeps 200 net, 238 gross', () => {
  const item = BillingReportAssembler.createHierarchyLineItem(makeHierarchyEntry(), vatLiable);
  assert.equal(item.provisionGrossAmount, 238);
  assert.equal(item.provisionVatAmount, 38);
  assert.equal(item.provisionNetAmount, 200);
});

test('hierarchy line item: VAT-exempt manager gets 200, no VAT (regression: was 238)', () => {
  const item = BillingReportAssembler.createHierarchyLineItem(makeHierarchyEntry(), vatExempt);
  assert.equal(item.provisionAmount, 200);
  assert.equal(item.provisionVatAmount, 0);
  assert.equal(item.provisionNetAmount, 200);
});

test('own line item: no-VAT revenue is unaffected by exemption status', () => {
  const entry = makeEntry();
  entry.hasVAT = false;
  entry.grossAmount = 1000;
  entry.vatAmount = 0;
  const liable = BillingReportAssembler.createOwnLineItem(entry, vatLiable);
  const exempt = BillingReportAssembler.createOwnLineItem({ ...entry }, vatExempt);
  assert.equal(liable.provisionAmount, 500);
  assert.equal(exempt.provisionAmount, 500);
  assert.equal(liable.provisionVatAmount, 0);
  assert.equal(exempt.provisionVatAmount, 0);
});
