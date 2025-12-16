/**
 * Value Object: ProductProvider
 * Represents product providers based on category
 */

import { REVENUE_CATEGORY_TYPES } from './RevenueCategory.js';

const PROVIDERS_BY_CATEGORY = {
  [REVENUE_CATEGORY_TYPES.BANK]: [
    { name: 'Sparkasse', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Volksbank', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Deutsche Bank', category: REVENUE_CATEGORY_TYPES.BANK },
  ],
  [REVENUE_CATEGORY_TYPES.INSURANCE]: [
    { name: 'Volkswohlbund', category: REVENUE_CATEGORY_TYPES.INSURANCE },
    { name: 'Provinzial', category: REVENUE_CATEGORY_TYPES.INSURANCE },
  ],
  [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: [],
  [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: [],
  [REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS]: [
    { name: 'EON', category: REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS },
    { name: 'Vattenfall', category: REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS },
  ],
};

export class ProductProvider {
  #name;
  #category;

  constructor({ name, category }) {
    this.#name = name;
    this.#category = category;
  }

  get name() {
    return this.#name;
  }

  get category() {
    return this.#category;
  }

  static getProvidersForCategory(categoryType) {
    const providers = PROVIDERS_BY_CATEGORY[categoryType] || [];
    return providers.map((p) => new ProductProvider(p));
  }

  static requiresFreeTextProvider(categoryType) {
    return (
      categoryType === REVENUE_CATEGORY_TYPES.REAL_ESTATE ||
      categoryType === REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT
    );
  }

  static get allProviders() {
    const all = [];
    Object.entries(PROVIDERS_BY_CATEGORY).forEach(([category, providers]) => {
      if (!this.requiresFreeTextProvider(category)) {
        providers.forEach((p) => all.push(new ProductProvider(p)));
      }
    });
    return all;
  }

  static fromNameAndCategory(name, categoryType) {
    if (this.requiresFreeTextProvider(categoryType)) {
      return new ProductProvider({ name, category: categoryType });
    }

    const providers = PROVIDERS_BY_CATEGORY[categoryType] || [];
    const found = providers.find((p) => p.name === name);
    return found ? new ProductProvider(found) : null;
  }

  toJSON() {
    return {
      name: this.#name,
      category: this.#category,
    };
  }

  static fromJSON(json) {
    return new ProductProvider({
      name: json.name,
      category: json.category,
    });
  }

  equals(other) {
    return (
      other instanceof ProductProvider &&
      this.#name === other.name &&
      this.#category === other.category
    );
  }

  toString() {
    return this.#name;
  }
}
