/**
 * Value Object: Product
 * Represents products based on category
 *
 * @deprecated Use CatalogService to load products dynamically.
 *             This hardcoded implementation is kept as fallback for backward compatibility.
 *             New code should use: revenueService.getProductsForCategory(categoryType)
 */

import { REVENUE_CATEGORY_TYPES } from './RevenueCategory.js';

const PRODUCTS_BY_CATEGORY = {
  [REVENUE_CATEGORY_TYPES.BANK]: [
    { name: 'Konto', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Baufi', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Privatkredit', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Bausparen', category: REVENUE_CATEGORY_TYPES.BANK },
    { name: 'Gewerbekredit', category: REVENUE_CATEGORY_TYPES.BANK },
  ],
  [REVENUE_CATEGORY_TYPES.INSURANCE]: [
    { name: 'LV', category: REVENUE_CATEGORY_TYPES.INSURANCE },
    { name: 'Sach.', category: REVENUE_CATEGORY_TYPES.INSURANCE },
    { name: 'KV', category: REVENUE_CATEGORY_TYPES.INSURANCE },
    { name: 'GKV', category: REVENUE_CATEGORY_TYPES.INSURANCE },
  ],
  [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: [
    { name: 'Vermietung', category: REVENUE_CATEGORY_TYPES.REAL_ESTATE },
    { name: 'WEG', category: REVENUE_CATEGORY_TYPES.REAL_ESTATE },
  ],
  [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: [
    { name: 'Hausverwaltung', category: REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT },
  ],
  [REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS]: [
    { name: 'Strom & Gas', category: REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS },
  ],
};

export class Product {
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

  static getProductsForCategory(categoryType) {
    const products = PRODUCTS_BY_CATEGORY[categoryType] || [];
    return products.map((p) => new Product(p));
  }

  static get allProducts() {
    const all = [];
    Object.values(PRODUCTS_BY_CATEGORY).forEach((products) => {
      products.forEach((p) => all.push(new Product(p)));
    });
    return all;
  }

  static fromNameAndCategory(name, categoryType) {
    const products = PRODUCTS_BY_CATEGORY[categoryType] || [];
    const found = products.find((p) => p.name === name);
    return found ? new Product(found) : null;
  }

  toJSON() {
    return {
      name: this.#name,
      category: this.#category,
    };
  }

  static fromJSON(json) {
    return new Product({
      name: json.name,
      category: json.category,
    });
  }

  equals(other) {
    return (
      other instanceof Product &&
      this.#name === other.name &&
      this.#category === other.category
    );
  }

  toString() {
    return this.#name;
  }
}
