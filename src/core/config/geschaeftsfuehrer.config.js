/**
 * Core Config: Geschaeftsfuehrer
 * Central configuration for all Geschaeftsfuehrer (managing directors) data.
 * Single source of truth - replaces hardcoded GF data across the codebase.
 */

const GESCHAEFTSFUEHRER_CONFIG = new Map([
  ['marcel-liebetrau', {
    id: 'marcel-liebetrau',
    name: 'Marcel Liebetrau',
    firstName: 'Marcel',
    lastName: 'Liebetrau',
    email: 'liebetrau@trialog-makler.de',
    defaultProvisions: {
      bank: 90,
      insurance: 90,
      realEstate: 90,
    },
  }],
  ['daniel-lippa', {
    id: 'daniel-lippa',
    name: 'Daniel Lippa',
    firstName: 'Daniel',
    lastName: 'Lippa',
    email: 'lippa@trialog-makler.de',
    defaultProvisions: {
      bank: 90,
      insurance: 90,
      realEstate: 90,
    },
  }],
]);

/**
 * Array of all Geschaeftsfuehrer IDs
 */
export const GESCHAEFTSFUEHRER_IDS = Array.from(GESCHAEFTSFUEHRER_CONFIG.keys());

/**
 * Check if an ID belongs to a Geschaeftsfuehrer
 * @param {string} id
 * @returns {boolean}
 */
export function isGeschaeftsfuehrerId(id) {
  return GESCHAEFTSFUEHRER_CONFIG.has(id);
}

/**
 * Get Geschaeftsfuehrer config by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getGeschaeftsfuehrerConfig(id) {
  return GESCHAEFTSFUEHRER_CONFIG.get(id) || null;
}

/**
 * Get Geschaeftsfuehrer config by email
 * @param {string} email
 * @returns {Object|null}
 */
export function getGeschaeftsfuehrerByEmail(email) {
  for (const config of GESCHAEFTSFUEHRER_CONFIG.values()) {
    if (config.email === email) {
      return config;
    }
  }
  return null;
}

/**
 * Get all Geschaeftsfuehrer configs as array
 * @returns {Array<Object>}
 */
export function getAllGeschaeftsfuehrer() {
  return Array.from(GESCHAEFTSFUEHRER_CONFIG.values());
}

/**
 * Build a flat employee-like object for a Geschaeftsfuehrer (for hierarchy/revenue integration)
 * @param {string} id
 * @returns {Object|null}
 */
export function buildGeschaeftsfuehrerNode(id) {
  const config = GESCHAEFTSFUEHRER_CONFIG.get(id);
  if (!config) return null;

  return {
    id: config.id,
    name: config.name,
    firstName: config.firstName,
    lastName: config.lastName,
    email: config.email,
    bankProvision: config.defaultProvisions.bank,
    insuranceProvision: config.defaultProvisions.insurance,
    realEstateProvision: config.defaultProvisions.realEstate,
    isGeschaeftsfuehrer: true,
  };
}
