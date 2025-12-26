/**
 * Entity: RevenueEntry
 * Core domain entity representing a revenue entry for an employee
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { RevenueCategory } from '../value-objects/RevenueCategory.js';
import { RevenueStatus, REVENUE_STATUS_TYPES } from '../value-objects/RevenueStatus.js';
import { Product } from '../value-objects/Product.js';
import { ProductProvider } from '../value-objects/ProductProvider.js';
import { CustomerAddress } from '../value-objects/CustomerAddress.js';

export class RevenueEntry {
  #id;
  #employeeId;
  #customerNumber;
  #customerName;
  #customerAddress;
  #category;
  #provisionType;
  #product;
  #productProvider;
  #propertyAddress;
  #contractNumber;
  #provisionAmount;
  #notes;
  #status;
  #entryDate;
  #createdAt;
  #updatedAt;
  #ownerProvisionSnapshot;
  #managerProvisionSnapshot;
  #hierarchySnapshot;

  constructor({
    id = null,
    employeeId,
    customerNumber,
    customerName,
    customerAddress = null,
    category,
    provisionType = null,
    product,
    productProvider,
    propertyAddress = null,
    contractNumber,
    provisionAmount,
    notes = '',
    status = null,
    entryDate = null,
    createdAt = null,
    updatedAt = null,
    ownerProvisionSnapshot = null,
    managerProvisionSnapshot = null,
    hierarchySnapshot = null,
  }) {
    this.#id = id || generateUUID();
    this.#employeeId = employeeId;
    this.#customerNumber = customerNumber;
    this.#customerName = customerName;
    this.#customerAddress =
      customerAddress instanceof CustomerAddress
        ? customerAddress
        : new CustomerAddress(customerAddress || {});
    this.#category =
      category instanceof RevenueCategory
        ? category
        : new RevenueCategory(category);
    // provisionType determines which HierarchyNode provision field to use (bank, insurance, realEstate)
    // Fallback to category type for backward compatibility with legacy entries
    this.#provisionType = provisionType || this.#inferProvisionType(this.#category.type);
    this.#product =
      product instanceof Product ? product : Product.fromJSON(product);
    this.#productProvider =
      productProvider instanceof ProductProvider
        ? productProvider
        : ProductProvider.fromJSON(productProvider);
    this.#propertyAddress = propertyAddress;
    this.#contractNumber = contractNumber;
    this.#provisionAmount = provisionAmount;
    this.#notes = notes;
    this.#status =
      status instanceof RevenueStatus
        ? status
        : new RevenueStatus(status || REVENUE_STATUS_TYPES.SUBMITTED);
    this.#entryDate = entryDate ? new Date(entryDate) : new Date();
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();

    // Provision Snapshots - captured at creation time for immutability
    this.#ownerProvisionSnapshot = ownerProvisionSnapshot;
    this.#managerProvisionSnapshot = managerProvisionSnapshot;
    this.#hierarchySnapshot = hierarchySnapshot || null;
  }

  get id() {
    return this.#id;
  }

  get employeeId() {
    return this.#employeeId;
  }

  get customerNumber() {
    return this.#customerNumber;
  }

  get customerName() {
    return this.#customerName;
  }

  get customerAddress() {
    return this.#customerAddress;
  }

  get category() {
    return this.#category;
  }

  get provisionType() {
    return this.#provisionType;
  }

  get product() {
    return this.#product;
  }

  get productProvider() {
    return this.#productProvider;
  }

  get propertyAddress() {
    return this.#propertyAddress;
  }

  get contractNumber() {
    return this.#contractNumber;
  }

  get provisionAmount() {
    return this.#provisionAmount;
  }

  get notes() {
    return this.#notes;
  }

  get status() {
    return this.#status;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  get entryDate() {
    return this.#entryDate;
  }

  get ownerProvisionSnapshot() {
    return this.#ownerProvisionSnapshot;
  }

  get managerProvisionSnapshot() {
    return this.#managerProvisionSnapshot;
  }

  get hierarchySnapshot() {
    return this.#hierarchySnapshot;
  }

  get hasProvisionSnapshot() {
    return this.#ownerProvisionSnapshot !== null && this.#ownerProvisionSnapshot !== undefined;
  }

  get requiresPropertyAddress() {
    return ProductProvider.requiresFreeTextProvider(this.#category.type);
  }

  get providerDisplayText() {
    if (this.requiresPropertyAddress && this.#propertyAddress) {
      return this.#propertyAddress;
    }
    return this.#productProvider.name;
  }

  get isComplete() {
    return (
      this.#customerName &&
      this.#customerAddress.isComplete &&
      this.#contractNumber &&
      this.#provisionAmount >= 0 &&
      (!this.requiresPropertyAddress || this.#propertyAddress)
    );
  }

  /**
   * Infer provisionType from category type for backward compatibility
   * Used when provisionType is not explicitly provided (legacy entries)
   */
  #inferProvisionType(categoryType) {
    // Map known category types to provision types
    const CATEGORY_TO_PROVISION = {
      bank: 'bank',
      insurance: 'insurance',
      realEstate: 'realEstate',
      propertyManagement: 'realEstate',
      energyContracts: 'bank', // Default to bank for energy contracts
    };
    return CATEGORY_TO_PROVISION[categoryType] || 'bank';
  }

  update(updates) {
    if (updates.customerName !== undefined) {
      this.#customerName = updates.customerName;
    }
    if (updates.customerAddress !== undefined) {
      this.#customerAddress =
        updates.customerAddress instanceof CustomerAddress
          ? updates.customerAddress
          : new CustomerAddress(updates.customerAddress);
    }
    if (updates.category !== undefined) {
      this.#category =
        updates.category instanceof RevenueCategory
          ? updates.category
          : new RevenueCategory(updates.category);
    }
    if (updates.provisionType !== undefined) {
      this.#provisionType = updates.provisionType;
    }
    if (updates.product !== undefined) {
      this.#product =
        updates.product instanceof Product
          ? updates.product
          : Product.fromJSON(updates.product);
    }
    if (updates.productProvider !== undefined) {
      this.#productProvider =
        updates.productProvider instanceof ProductProvider
          ? updates.productProvider
          : ProductProvider.fromJSON(updates.productProvider);
    }
    if (updates.propertyAddress !== undefined) {
      this.#propertyAddress = updates.propertyAddress;
    }
    if (updates.contractNumber !== undefined) {
      this.#contractNumber = updates.contractNumber;
    }
    if (updates.provisionAmount !== undefined) {
      this.#provisionAmount = updates.provisionAmount;
    }
    if (updates.notes !== undefined) {
      this.#notes = updates.notes;
    }
    if (updates.status !== undefined) {
      this.#status =
        updates.status instanceof RevenueStatus
          ? updates.status
          : new RevenueStatus(updates.status);
    }
    if (updates.entryDate !== undefined) {
      this.#entryDate = new Date(updates.entryDate);
    }
    this.#updatedAt = new Date();

    return this;
  }

  toJSON() {
    return {
      id: this.#id,
      employeeId: this.#employeeId,
      customerNumber: this.#customerNumber,
      customerName: this.#customerName,
      customerAddress: this.#customerAddress.toJSON(),
      category: this.#category.type,
      provisionType: this.#provisionType,
      product: this.#product.toJSON(),
      productProvider: this.#productProvider.toJSON(),
      propertyAddress: this.#propertyAddress,
      contractNumber: this.#contractNumber,
      provisionAmount: this.#provisionAmount,
      notes: this.#notes,
      status: this.#status.toJSON(),
      entryDate: this.#entryDate.toISOString(),
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
      // Provision snapshots for immutability
      ownerProvisionSnapshot: this.#ownerProvisionSnapshot,
      managerProvisionSnapshot: this.#managerProvisionSnapshot,
      hierarchySnapshot: this.#hierarchySnapshot,
    };
  }

  static fromJSON(json) {
    return new RevenueEntry({
      id: json.id,
      employeeId: json.employeeId,
      customerNumber: json.customerNumber,
      customerName: json.customerName,
      customerAddress: json.customerAddress
        ? CustomerAddress.fromJSON(json.customerAddress)
        : null,
      category: json.category,
      provisionType: json.provisionType || null,
      product: json.product,
      productProvider: json.productProvider,
      propertyAddress: json.propertyAddress,
      contractNumber: json.contractNumber,
      provisionAmount: json.provisionAmount,
      notes: json.notes,
      status: json.status,
      entryDate: json.entryDate,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      // Provision snapshots (may be null for legacy entries)
      ownerProvisionSnapshot: json.ownerProvisionSnapshot ?? null,
      managerProvisionSnapshot: json.managerProvisionSnapshot ?? null,
      hierarchySnapshot: json.hierarchySnapshot ?? null,
    });
  }
}
