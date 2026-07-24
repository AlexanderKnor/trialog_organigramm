import { test } from 'node:test';
import assert from 'node:assert/strict';

import { roundCurrency } from './currency.js';

test('roundCurrency: rounds to 2 decimals without float drift', () => {
  assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  assert.equal(roundCurrency(2.675), 2.68);
  assert.equal(roundCurrency(106.785), 106.79);
});

test('roundCurrency: is symmetric around zero (banker-neutral away-from-zero)', () => {
  // Regression: negatives (clawbacks) must not be rounded in the company's favour.
  assert.equal(roundCurrency(-106.785), -106.79);
  assert.equal(roundCurrency(-2.675), -2.68);
  assert.equal(roundCurrency(-0.005), -0.01);
});

test('roundCurrency: sub-cent magnitudes collapse to 0', () => {
  assert.equal(roundCurrency(0.004), 0);
  assert.equal(roundCurrency(-0.004), 0);
});

test('roundCurrency: exponential-notation inputs never produce NaN', () => {
  // Regression: '1e-7e2' fed to Math.round used to yield NaN and poison sums.
  assert.equal(roundCurrency(1e-7), 0);
  assert.equal(roundCurrency(-1e-9), 0);
});

test('roundCurrency: non-finite and non-number inputs are 0', () => {
  assert.equal(roundCurrency(NaN), 0);
  assert.equal(roundCurrency(Infinity), 0);
  assert.equal(roundCurrency('12.34'), 0);
  assert.equal(roundCurrency(undefined), 0);
});
