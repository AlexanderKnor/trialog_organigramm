/**
 * Entity: HierarchicalRevenueEntry
 * Represents a revenue entry from a subordinate with calculated provision difference
 */

import { REVENUE_CATEGORY_TYPES } from '../value-objects/RevenueCategory.js';

export class HierarchicalRevenueEntry {
  #originalEntry;
  #owner;
  #manager;
  #managerProvisionPercentage;
  #ownerProvisionPercentage;
  #managerProvisionAmount;
  #ownerProvisionAmount;
  #hierarchyLevel;

  constructor({
    originalEntry,
    owner,
    manager,
    managerProvisionPercentage,
    ownerProvisionPercentage,
    managerProvisionAmount,
    ownerProvisionAmount,
    hierarchyLevel,
  }) {
    this.#originalEntry = originalEntry;
    this.#owner = owner;
    this.#manager = manager;
    this.#managerProvisionPercentage = managerProvisionPercentage;
    this.#ownerProvisionPercentage = ownerProvisionPercentage;
    this.#managerProvisionAmount = managerProvisionAmount;
    this.#ownerProvisionAmount = ownerProvisionAmount;
    this.#hierarchyLevel = hierarchyLevel;
  }

  get originalEntry() {
    return this.#originalEntry;
  }

  get owner() {
    return this.#owner;
  }

  get manager() {
    return this.#manager;
  }

  get managerProvisionPercentage() {
    return this.#managerProvisionPercentage;
  }

  get ownerProvisionPercentage() {
    return this.#ownerProvisionPercentage;
  }

  get managerProvisionAmount() {
    return this.#managerProvisionAmount;
  }

  get ownerProvisionAmount() {
    return this.#ownerProvisionAmount;
  }

  get hierarchyLevel() {
    return this.#hierarchyLevel;
  }

  get hasManagerProvision() {
    return this.#managerProvisionAmount > 0;
  }

  get provisionDifferencePercentage() {
    return this.#managerProvisionPercentage - this.#ownerProvisionPercentage;
  }

  static #getProvisionForCategory(employee, categoryType) {
    switch (categoryType) {
      case REVENUE_CATEGORY_TYPES.BANK:
        return employee.bankProvision;
      case REVENUE_CATEGORY_TYPES.INSURANCE:
        return employee.insuranceProvision;
      case REVENUE_CATEGORY_TYPES.REAL_ESTATE:
        return employee.realEstateProvision;
      case REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT:
        return employee.realEstateProvision;
      case REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS:
        return 0;
      default:
        return 0;
    }
  }

  static calculate({ entry, owner, manager, hierarchyLevel }) {
    const ownerProvision = this.#getProvisionForCategory(
      owner,
      entry.category.type,
    );
    const managerProvision = this.#getProvisionForCategory(
      manager,
      entry.category.type,
    );

    const provisionDifference = managerProvision - ownerProvision;
    const managerAmount =
      provisionDifference > 0
        ? entry.provisionAmount * (provisionDifference / 100)
        : 0;

    const ownerAmount = entry.provisionAmount * (ownerProvision / 100);

    return new HierarchicalRevenueEntry({
      originalEntry: entry,
      owner,
      manager,
      managerProvisionPercentage: managerProvision,
      ownerProvisionPercentage: ownerProvision,
      managerProvisionAmount: managerAmount,
      ownerProvisionAmount: ownerAmount,
      hierarchyLevel,
    });
  }

  toJSON() {
    return {
      originalEntry: this.#originalEntry.toJSON(),
      ownerId: this.#owner.id,
      ownerName: this.#owner.name,
      managerId: this.#manager.id,
      managerProvisionPercentage: this.#managerProvisionPercentage,
      ownerProvisionPercentage: this.#ownerProvisionPercentage,
      managerProvisionAmount: this.#managerProvisionAmount,
      ownerProvisionAmount: this.#ownerProvisionAmount,
      hierarchyLevel: this.#hierarchyLevel,
    };
  }
}
