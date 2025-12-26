/**
 * Value Object: RevenueCategory
 * Represents revenue categories with their display names
 *
 * NOTE: This class now supports dynamic categories from the CatalogService.
 *       The hardcoded REVENUE_CATEGORY_TYPES are kept as fallback for backward compatibility.
 *       New categories can be added via the Catalog Management UI.
 */

export const REVENUE_CATEGORY_TYPES = {
  BANK: 'bank',
  INSURANCE: 'insurance',
  REAL_ESTATE: 'realEstate',
  PROPERTY_MANAGEMENT: 'propertyManagement',
  ENERGY_CONTRACTS: 'energyContracts',
};

const CATEGORY_DISPLAY_NAMES = {
  [REVENUE_CATEGORY_TYPES.BANK]: 'Bank',
  [REVENUE_CATEGORY_TYPES.INSURANCE]: 'Versicherung',
  [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: 'Immobilien',
  [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: 'Hausverwaltung',
  [REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS]: 'Energieverträge',
};

export class RevenueCategory {
  #type;

  constructor(type) {
    // Accept any non-empty string as category type
    // Dynamic categories are validated in CatalogService, not here
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new Error('Category type must be a non-empty string');
    }
    this.#type = type;
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    return CATEGORY_DISPLAY_NAMES[this.#type] || this.#type;
  }

  static get allCategories() {
    return Object.values(REVENUE_CATEGORY_TYPES).map(
      (type) => new RevenueCategory(type),
    );
  }

  static fromString(value) {
    return new RevenueCategory(value);
  }

  toJSON() {
    return { type: this.#type };
  }

  static fromJSON(json) {
    return new RevenueCategory(json.type || json);
  }

  equals(other) {
    return other instanceof RevenueCategory && this.#type === other.type;
  }

  toString() {
    return this.displayName;
  }
}
