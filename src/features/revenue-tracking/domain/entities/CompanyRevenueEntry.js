/**
 * Domain Entity: CompanyRevenueEntry
 * Represents a revenue entry with company's cascade provision
 * Company gets the remainder: 100% - (highest provision % in hierarchy)
 */

import { generateUUID } from '../../../../core/utils/index.js';

export class CompanyRevenueEntry {
  #id;
  #originalEntry;
  #entryOwner;
  #directSubordinate;
  #company;
  #hierarchyPath;
  #directSubordinateProvisionPercentage;
  #highestProvisionPercentageInPath;
  #companyProvisionPercentage;
  #companyProvisionAmount;
  #ownerProvisionAmount;

  constructor({
    id = null,
    originalEntry,
    entryOwner,
    directSubordinate,
    company,
    hierarchyPath,
    directSubordinateProvisionPercentage,
    highestProvisionPercentageInPath,
    companyProvisionPercentage,
    companyProvisionAmount,
    ownerProvisionAmount,
  }) {
    this.#id = id || generateUUID();
    this.#originalEntry = originalEntry;
    this.#entryOwner = entryOwner;
    this.#directSubordinate = directSubordinate;
    this.#company = company;
    this.#hierarchyPath = hierarchyPath;
    this.#directSubordinateProvisionPercentage = directSubordinateProvisionPercentage;
    this.#highestProvisionPercentageInPath = highestProvisionPercentageInPath;
    this.#companyProvisionPercentage = companyProvisionPercentage;
    this.#companyProvisionAmount = companyProvisionAmount;
    this.#ownerProvisionAmount = ownerProvisionAmount;
  }

  /**
   * Factory to calculate company cascade provision
   */
  static calculate({
    entry,
    entryOwner,
    directSubordinate,
    company,
    hierarchyPath,
  }) {
    let ownerProvision, directSubProvision, highestProvision;

    // PRIORITY: Use snapshots if available
    if (entry.hasProvisionSnapshot) {
      ownerProvision = entry.ownerProvisionSnapshot;

      // For highest provision, use owner's snapshot (simplification - could iterate hierarchy snapshots)
      highestProvision = ownerProvision;
    }
    // FALLBACK: Dynamic calculation for legacy entries
    else {
      const provisionType = entry.provisionType;

      // Get owner's provision based on provisionType or category
      ownerProvision = provisionType
        ? this.#getProvisionForType(entryOwner, provisionType)
        : this.#getProvisionForCategory(entryOwner, entry.category.type);

      directSubProvision = provisionType
        ? this.#getProvisionForType(directSubordinate, provisionType)
        : this.#getProvisionForCategory(directSubordinate, entry.category.type);

      // Find the HIGHEST provision percentage in the entire hierarchy path
      // (excluding the company itself)
      highestProvision = 0;
      for (const employee of hierarchyPath) {
        if (employee.id !== company.id) {
          const provision = provisionType
            ? this.#getProvisionForType(employee, provisionType)
            : this.#getProvisionForCategory(employee, entry.category.type);
          if (provision > highestProvision) {
            highestProvision = provision;
          }
        }
      }
    }

    // Company gets the remainder: 100% - HIGHEST provision in the chain
    const companyProvision = 100 - highestProvision;

    // Calculate amounts
    // Note: Owner amount is reduced by tip provider if present
    const tipProviderPercentage = entry.tipProviderProvisionPercentage || 0;
    const ownerEffectiveProvision = Math.max(0, ownerProvision - tipProviderPercentage);

    const companyAmount = entry.provisionAmount * (companyProvision / 100);
    const ownerAmount = entry.provisionAmount * (ownerEffectiveProvision / 100);

    return new CompanyRevenueEntry({
      originalEntry: entry,
      entryOwner,
      directSubordinate,
      company,
      hierarchyPath,
      directSubordinateProvisionPercentage: directSubProvision,
      highestProvisionPercentageInPath: highestProvision,
      companyProvisionPercentage: companyProvision,
      companyProvisionAmount: companyAmount,
      ownerProvisionAmount: ownerAmount,
    });
  }

  /**
   * Get provision percentage for employee based on provisionType
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
        return 0;
    }
  }

  /**
   * Get provision percentage for employee based on category (legacy support)
   */
  static #getProvisionForCategory(employee, categoryType) {
    switch (categoryType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
      case 'propertyManagement':
        return employee.realEstateProvision || 0;
      case 'energyContracts':
        return employee.bankProvision || 0; // Default to bank for energy
      default:
        return 0;
    }
  }

  // Getters
  get id() { return this.#id; }
  get originalEntry() { return this.#originalEntry; }
  get entryOwner() { return this.#entryOwner; }
  get employee() { return this.#entryOwner; } // Alias for compatibility
  get directSubordinate() { return this.#directSubordinate; }
  get company() { return this.#company; }
  get hierarchyPath() { return [...this.#hierarchyPath]; }
  get directSubordinateProvisionPercentage() { return this.#directSubordinateProvisionPercentage; }
  get highestProvisionPercentageInPath() { return this.#highestProvisionPercentageInPath; }
  get companyProvisionPercentage() { return this.#companyProvisionPercentage; }
  get companyProvisionAmount() { return this.#companyProvisionAmount; }
  get ownerProvisionAmount() { return this.#ownerProvisionAmount; }
  get employeeProvisionPercentage() { return this.#highestProvisionPercentageInPath; } // Alias

  /**
   * Check if company gets provision from this entry
   */
  get hasCompanyProvision() {
    return this.#companyProvisionAmount > 0;
  }

  /**
   * Get hierarchy depth (how many levels from owner to company)
   */
  get hierarchyDepth() {
    return this.#hierarchyPath.length;
  }

  toJSON() {
    return {
      id: this.#id,
      originalEntry: this.#originalEntry.toJSON ? this.#originalEntry.toJSON() : this.#originalEntry,
      entryOwnerId: this.#entryOwner.id,
      entryOwnerName: this.#entryOwner.name,
      directSubordinateId: this.#directSubordinate.id,
      companyId: this.#company.id,
      hierarchyPathIds: this.#hierarchyPath.map((e) => e.id),
      directSubordinateProvisionPercentage: this.#directSubordinateProvisionPercentage,
      highestProvisionPercentageInPath: this.#highestProvisionPercentageInPath,
      companyProvisionPercentage: this.#companyProvisionPercentage,
      companyProvisionAmount: this.#companyProvisionAmount,
      ownerProvisionAmount: this.#ownerProvisionAmount,
    };
  }
}
