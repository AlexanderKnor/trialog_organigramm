/**
 * Value Object: WIFOCategory
 * Maps WIFO categories (Sparte) to internal revenue categories
 */

import { REVENUE_CATEGORY_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueCategory.js';

export const WIFO_CATEGORY = Object.freeze({
  PKV: 'PKV', // Private Krankenversicherung
  BU: 'BU', // Berufsunfähigkeit
  RV: 'RV', // Rentenversicherung
  LV: 'LV', // Lebensversicherung
  SHU: 'SHU', // Sach-/Haftpflicht-/Unfallversicherung
  KFZ: 'KFZ', // Kraftfahrzeugversicherung
  RS: 'RS', // Rechtsschutz
  SONSTIGE: 'SONSTIGE', // Other
});

export const WIFO_CATEGORY_DISPLAY = Object.freeze({
  [WIFO_CATEGORY.PKV]: 'Private Krankenversicherung',
  [WIFO_CATEGORY.BU]: 'Berufsunfähigkeit',
  [WIFO_CATEGORY.RV]: 'Rentenversicherung',
  [WIFO_CATEGORY.LV]: 'Lebensversicherung',
  [WIFO_CATEGORY.SHU]: 'Sach/Haftpflicht/Unfall',
  [WIFO_CATEGORY.KFZ]: 'Kraftfahrzeug',
  [WIFO_CATEGORY.RS]: 'Rechtsschutz',
  [WIFO_CATEGORY.SONSTIGE]: 'Sonstige',
});

// Mapping from WIFO categories to internal revenue categories
const WIFO_TO_INTERNAL_CATEGORY = Object.freeze({
  [WIFO_CATEGORY.PKV]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.BU]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.RV]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.LV]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.SHU]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.KFZ]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.RS]: REVENUE_CATEGORY_TYPES.INSURANCE,
  [WIFO_CATEGORY.SONSTIGE]: REVENUE_CATEGORY_TYPES.INSURANCE,
});

export class WIFOCategory {
  #category;

  constructor(category) {
    const normalized = this.#normalizeCategory(category);
    if (!normalized) {
      throw new Error(`Invalid WIFO category: ${category}`);
    }
    this.#category = normalized;
  }

  #normalizeCategory(category) {
    if (typeof category !== 'string') {
      return null;
    }

    const upper = category.toUpperCase().trim();

    // Direct match
    if (Object.values(WIFO_CATEGORY).includes(upper)) {
      return upper;
    }

    // Common aliases and variations
    const aliasMap = {
      'PRIVATE KRANKENVERSICHERUNG': WIFO_CATEGORY.PKV,
      'PRIVATE KRANKEN': WIFO_CATEGORY.PKV,
      'KRANKEN': WIFO_CATEGORY.PKV,
      'BERUFSUNFÄHIGKEIT': WIFO_CATEGORY.BU,
      'BERUFSUNFAEHIGKEIT': WIFO_CATEGORY.BU,
      'RENTE': WIFO_CATEGORY.RV,
      'RENTENVERSICHERUNG': WIFO_CATEGORY.RV,
      'LEBEN': WIFO_CATEGORY.LV,
      'LEBENSVERSICHERUNG': WIFO_CATEGORY.LV,
      'SACH': WIFO_CATEGORY.SHU,
      'HAFTPFLICHT': WIFO_CATEGORY.SHU,
      'UNFALL': WIFO_CATEGORY.SHU,
      'SACHVERSICHERUNG': WIFO_CATEGORY.SHU,
      'KFZ-VERSICHERUNG': WIFO_CATEGORY.KFZ,
      'AUTO': WIFO_CATEGORY.KFZ,
      'RECHTSSCHUTZ': WIFO_CATEGORY.RS,
      'RECHTSSCHUTZVERSICHERUNG': WIFO_CATEGORY.RS,
    };

    for (const [alias, cat] of Object.entries(aliasMap)) {
      if (upper.includes(alias)) {
        return cat;
      }
    }

    // Fallback to SONSTIGE for unknown categories
    return WIFO_CATEGORY.SONSTIGE;
  }

  get value() {
    return this.#category;
  }

  get displayName() {
    return WIFO_CATEGORY_DISPLAY[this.#category];
  }

  get internalCategoryType() {
    return WIFO_TO_INTERNAL_CATEGORY[this.#category];
  }

  get isInsurance() {
    return [
      WIFO_CATEGORY.PKV,
      WIFO_CATEGORY.BU,
      WIFO_CATEGORY.RV,
      WIFO_CATEGORY.LV,
      WIFO_CATEGORY.SHU,
      WIFO_CATEGORY.KFZ,
      WIFO_CATEGORY.RS,
      WIFO_CATEGORY.SONSTIGE,
    ].includes(this.#category);
  }

  equals(other) {
    if (!(other instanceof WIFOCategory)) {
      return false;
    }
    return this.#category === other.value;
  }

  toJSON() {
    return this.#category;
  }

  static fromJSON(json) {
    return new WIFOCategory(json);
  }

  static tryParse(value) {
    try {
      return new WIFOCategory(value);
    } catch {
      return null;
    }
  }
}
