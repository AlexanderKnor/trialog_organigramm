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

  /**
   * Get employee's provision rate based on provisionType
   * provisionType is one of: 'bank', 'insurance', 'realEstate'
   */
  static #getProvisionForType(employee, provisionType) {
    switch (provisionType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
        return employee.realEstateProvision || 0;
      default:
        // Fallback: try to infer from provisionType string
        // or return 0 if unknown
        return 0;
    }
  }

  /**
   * Legacy method for backward compatibility with old entries
   * that don't have explicit provisionType
   */
  static #getProvisionForCategory(employee, categoryType) {
    switch (categoryType) {
      case REVENUE_CATEGORY_TYPES.BANK:
        return employee.bankProvision || 0;
      case REVENUE_CATEGORY_TYPES.INSURANCE:
        return employee.insuranceProvision || 0;
      case REVENUE_CATEGORY_TYPES.REAL_ESTATE:
      case REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT:
        return employee.realEstateProvision || 0;
      case REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS:
        return employee.bankProvision || 0; // Default to bank for energy
      default:
        return 0;
    }
  }

  static calculate({ entry, owner, manager, hierarchyLevel }) {
    let ownerProvision, managerProvision;

    // PRIORITY 1: Use provision snapshots if available (immutable, point-in-time values)
    // This ensures that provision calculations remain consistent even if hierarchy provisions change
    if (entry.hasProvisionSnapshot) {
      ownerProvision = entry.ownerProvisionSnapshot;
      managerProvision = entry.managerProvisionSnapshot || 0; // May be null if no manager at creation
    }
    // FALLBACK: Dynamic calculation for legacy entries without snapshots
    else {
      const provisionType = entry.provisionType;

      if (provisionType) {
        ownerProvision = this.#getProvisionForType(owner, provisionType);
        managerProvision = this.#getProvisionForType(manager, provisionType);
      } else {
        // Legacy fallback for entries without provisionType
        ownerProvision = this.#getProvisionForCategory(owner, entry.category.type);
        managerProvision = this.#getProvisionForCategory(manager, entry.category.type);
      }
    }

    // Calculate provision amounts
    // Tip provider provision is deducted from COMPANY, not from owner
    // Owner keeps their full provision percentage
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
