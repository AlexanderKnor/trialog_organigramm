/**
 * RevenueViewPolicy — who sees whose revenue on the entry point.
 *
 * GF identities come from the central config rather than literals here, so a
 * roster change cannot silently turn these into tests of nothing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveRevenueView,
  canChooseRevenueScope,
  REVENUE_VIEW_KINDS,
  REVENUE_VIEW_SCOPES,
  REVENUE_VIEW_REASONS,
} from './RevenueViewPolicy.js';
import {
  GESCHAEFTSFUEHRER_IDS,
  getGeschaeftsfuehrerConfig,
} from '../../../../core/config/geschaeftsfuehrer.config.js';

const gf = getGeschaeftsfuehrerConfig(GESCHAEFTSFUEHRER_IDS[0]);

const someTree = { rootId: 'root-1' };

test('employee sees own view resolved from the linked node', () => {
  const view = resolveRevenueView({
    isAdmin: false,
    isEmployee: true,
    email: 'mitarbeiter@example.de',
    linkedNodeId: 'node-42',
    tree: someTree,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.OWN);
  assert.equal(view.employeeId, 'node-42');
  assert.equal(view.mode, 'own');
  assert.equal(view.fetch, 'byEmployee');
});

test('employee without linked node gets the linking error, never data', () => {
  const view = resolveRevenueView({
    isAdmin: false,
    isEmployee: true,
    email: 'mitarbeiter@example.de',
    linkedNodeId: null,
    tree: someTree,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.ERROR);
  assert.equal(view.reason, REVENUE_VIEW_REASONS.NO_LINKED_NODE);
});

test('admin defaults to the company view from the tree root', () => {
  const view = resolveRevenueView({
    isAdmin: true,
    isEmployee: false,
    email: 'admin@example.de',
    linkedNodeId: null,
    tree: someTree,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.COMPANY);
  assert.equal(view.employeeId, 'root-1');
  assert.equal(view.mode, 'company');
  assert.equal(view.fetch, 'company');
});

test('admin without a tree gets the empty state', () => {
  const view = resolveRevenueView({
    isAdmin: true,
    isEmployee: false,
    email: 'admin@example.de',
    linkedNodeId: null,
    tree: null,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.EMPTY);
  assert.equal(view.reason, REVENUE_VIEW_REASONS.NO_TREE);
});

test('GF defaults to the company view like any admin', () => {
  const view = resolveRevenueView({
    isAdmin: true,
    isEmployee: false,
    email: gf.email,
    linkedNodeId: null,
    tree: someTree,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.COMPANY);
  assert.equal(view.employeeId, 'root-1');
});

test('GF with own scope sees personal figures without needing a tree', () => {
  const view = resolveRevenueView({
    isAdmin: true,
    isEmployee: false,
    email: gf.email,
    linkedNodeId: null,
    tree: null,
    scope: REVENUE_VIEW_SCOPES.OWN,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.OWN);
  assert.equal(view.employeeId, gf.id);
  assert.equal(view.fetch, 'byEmployee');
});

test('scope switching is offered to GF only', () => {
  assert.equal(canChooseRevenueScope({ isAdmin: true, email: gf.email }), true);
  assert.equal(canChooseRevenueScope({ isAdmin: true, email: 'admin@example.de' }), false);
  assert.equal(canChooseRevenueScope({ isAdmin: false, email: gf.email }), false);
});

test('own scope from a non-GF admin still resolves to the company view', () => {
  const view = resolveRevenueView({
    isAdmin: true,
    isEmployee: false,
    email: 'admin@example.de',
    linkedNodeId: null,
    tree: someTree,
    scope: REVENUE_VIEW_SCOPES.OWN,
  });

  assert.equal(view.kind, REVENUE_VIEW_KINDS.COMPANY);
});
