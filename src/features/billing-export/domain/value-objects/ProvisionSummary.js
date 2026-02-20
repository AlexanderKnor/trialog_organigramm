/**
 * Value Object: ProvisionSummary
 * Aggregated summary of provisions for a billing report section
 */

import { roundCurrency } from '../../../../core/utils/index.js';

export class ProvisionSummary {
  #entryCount;
  #totalNet;
  #totalVat;
  #totalGross;
  #totalProvision;
  #totalProvisionVat;
  #totalProvisionGross;
  #categoryBreakdown;

  constructor({
    entryCount = 0,
    totalNet = 0,
    totalVat = 0,
    totalGross = 0,
    totalProvision = 0,
    totalProvisionVat = 0,
    totalProvisionGross = 0,
    categoryBreakdown = {},
  } = {}) {
    this.#entryCount = entryCount;
    this.#totalNet = totalNet;
    this.#totalVat = totalVat;
    this.#totalGross = totalGross;
    this.#totalProvision = totalProvision;
    this.#totalProvisionVat = totalProvisionVat;
    this.#totalProvisionGross = totalProvisionGross;
    this.#categoryBreakdown = { ...categoryBreakdown };
  }

  get entryCount() {
    return this.#entryCount;
  }

  get totalNet() {
    return this.#totalNet;
  }

  get totalVat() {
    return this.#totalVat;
  }

  get totalGross() {
    return this.#totalGross;
  }

  get totalProvision() {
    return this.#totalProvision;
  }

  get totalProvisionVat() {
    return this.#totalProvisionVat;
  }

  get totalProvisionGross() {
    return this.#totalProvisionGross;
  }

  get totalProvisionNet() {
    return roundCurrency(this.#totalProvision - this.#totalProvisionVat);
  }

  get categoryBreakdown() {
    return { ...this.#categoryBreakdown };
  }

  get isEmpty() {
    return this.#entryCount === 0;
  }

  get averageProvisionPerEntry() {
    if (this.#entryCount === 0) return 0;
    return this.#totalProvision / this.#entryCount;
  }

  get effectiveProvisionRate() {
    if (this.#totalNet === 0) return 0;
    return (this.#totalProvision / this.#totalNet) * 100;
  }

  static fromLineItems(lineItems) {
    if (!lineItems || lineItems.length === 0) {
      return new ProvisionSummary();
    }

    const categoryBreakdown = {};

    const totals = lineItems.reduce((acc, item) => {
      acc.entryCount += 1;
      acc.totalNet += item.netAmount || 0;
      acc.totalVat += item.vatAmount || 0;
      acc.totalGross += item.grossAmount || 0;
      acc.totalProvision += item.provisionAmount || 0;
      acc.totalProvisionVat += item.provisionVatAmount || 0;
      // provisionAmount IS the gross provision (calculated from gross revenue)
      acc.totalProvisionGross += item.provisionAmount || 0;

      const category = item.categoryType || 'other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = {
          count: 0,
          net: 0,
          provision: 0,
        };
      }
      categoryBreakdown[category].count += 1;
      categoryBreakdown[category].net += item.netAmount || 0;
      categoryBreakdown[category].provision += item.provisionAmount || 0;

      return acc;
    }, {
      entryCount: 0,
      totalNet: 0,
      totalVat: 0,
      totalGross: 0,
      totalProvision: 0,
      totalProvisionVat: 0,
      totalProvisionGross: 0,
    });

    return new ProvisionSummary({
      ...totals,
      categoryBreakdown,
    });
  }

  add(other) {
    const mergedBreakdown = { ...this.#categoryBreakdown };

    Object.entries(other.categoryBreakdown).forEach(([category, data]) => {
      if (!mergedBreakdown[category]) {
        mergedBreakdown[category] = { count: 0, net: 0, provision: 0 };
      }
      mergedBreakdown[category].count += data.count;
      mergedBreakdown[category].net += data.net;
      mergedBreakdown[category].provision += data.provision;
    });

    return new ProvisionSummary({
      entryCount: this.#entryCount + other.entryCount,
      totalNet: this.#totalNet + other.totalNet,
      totalVat: this.#totalVat + other.totalVat,
      totalGross: this.#totalGross + other.totalGross,
      totalProvision: this.#totalProvision + other.totalProvision,
      totalProvisionVat: this.#totalProvisionVat + other.totalProvisionVat,
      totalProvisionGross: this.#totalProvisionGross + other.totalProvisionGross,
      categoryBreakdown: mergedBreakdown,
    });
  }

  toJSON() {
    return {
      entryCount: this.#entryCount,
      totalNet: this.#totalNet,
      totalVat: this.#totalVat,
      totalGross: this.#totalGross,
      totalProvision: this.#totalProvision,
      totalProvisionVat: this.#totalProvisionVat,
      totalProvisionGross: this.#totalProvisionGross,
      categoryBreakdown: this.#categoryBreakdown,
    };
  }

  static fromJSON(json) {
    if (!json) return new ProvisionSummary();
    return new ProvisionSummary({
      entryCount: json.entryCount || 0,
      totalNet: json.totalNet || 0,
      totalVat: json.totalVat || 0,
      totalGross: json.totalGross || 0,
      totalProvision: json.totalProvision || 0,
      totalProvisionVat: json.totalProvisionVat || 0,
      totalProvisionGross: json.totalProvisionGross || 0,
      categoryBreakdown: json.categoryBreakdown || {},
    });
  }
}
