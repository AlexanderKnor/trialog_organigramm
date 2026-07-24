/**
 * Domain Policy: RevenueViewPolicy
 * Decides whose revenue a viewer sees on the entry point, and how to fetch it.
 *
 * Pure by design — it takes auth values rather than importing authService, so it
 * stays testable and the presentation layer keeps its one-way dependency.
 *
 * The returned object carries `fetch` and `mode` TOGETHER. RevenueDashboard
 * expects a different entry shape per mode and renders zeros rather than an
 * error when they disagree, so deciding both in one place is what stops them
 * drifting apart.
 *
 * Scopes: admins and Geschaeftsfuehrer default to the company view. GF are the
 * only viewers with a real choice — they carry personal revenue outside the
 * tree — so only they may switch to `own`; employees always see their own
 * numbers regardless of scope.
 */

import { getGeschaeftsfuehrerByEmail } from '../../../../core/config/geschaeftsfuehrer.config.js';

export const REVENUE_VIEW_KINDS = {
  OWN: 'own',
  COMPANY: 'company',
  ERROR: 'error',
  EMPTY: 'empty',
};

export const REVENUE_VIEW_SCOPES = {
  COMPANY: 'company',
  OWN: 'own',
};

export const REVENUE_VIEW_REASONS = {
  NO_LINKED_NODE: 'NO_LINKED_NODE',
  NO_TREE: 'NO_TREE',
};

/** Only Geschaeftsfuehrer can meaningfully switch between company and own. */
export function canChooseRevenueScope({ isAdmin, email }) {
  return isAdmin && Boolean(getGeschaeftsfuehrerByEmail(email));
}

/**
 * @param {Object} viewer
 * @param {boolean} viewer.isAdmin
 * @param {boolean} viewer.isEmployee
 * @param {string|null} viewer.email
 * @param {string|null} viewer.linkedNodeId
 * @param {Object|null} viewer.tree the single organisation tree, or null when none exists
 * @param {string} [viewer.scope] REVENUE_VIEW_SCOPES value, only honored for GF
 * @returns {{kind: string, employeeId?: string, mode?: string, fetch?: string, reason?: string}}
 */
export function resolveRevenueView({
  isAdmin,
  isEmployee,
  email,
  linkedNodeId,
  tree,
  scope = REVENUE_VIEW_SCOPES.COMPANY,
}) {
  const geschaeftsfuehrer = getGeschaeftsfuehrerByEmail(email);

  // GF personal numbers live outside the tree, so this branch needs no tree.
  // A GF without the admin role could never reach the company branch below,
  // which is why the non-admin case collapses to `own` regardless of scope.
  if (geschaeftsfuehrer && (scope === REVENUE_VIEW_SCOPES.OWN || !isAdmin)) {
    return {
      kind: REVENUE_VIEW_KINDS.OWN,
      employeeId: geschaeftsfuehrer.id,
      mode: 'own',
      fetch: 'byEmployee',
    };
  }

  if (isEmployee) {
    if (!linkedNodeId) {
      // The node's email does not match the login email. Surfaced as an error
      // state here on purpose: handing this to RevenueScreen would trip its
      // forced logout, which users read as the app throwing them out at random.
      return { kind: REVENUE_VIEW_KINDS.ERROR, reason: REVENUE_VIEW_REASONS.NO_LINKED_NODE };
    }

    return {
      kind: REVENUE_VIEW_KINDS.OWN,
      employeeId: linkedNodeId,
      mode: 'own',
      fetch: 'byEmployee',
    };
  }

  if (isAdmin) {
    if (!tree) {
      return { kind: REVENUE_VIEW_KINDS.EMPTY, reason: REVENUE_VIEW_REASONS.NO_TREE };
    }

    return {
      kind: REVENUE_VIEW_KINDS.COMPANY,
      employeeId: tree.rootId,
      mode: 'company',
      fetch: 'company',
    };
  }

  return { kind: REVENUE_VIEW_KINDS.ERROR, reason: REVENUE_VIEW_REASONS.NO_LINKED_NODE };
}
