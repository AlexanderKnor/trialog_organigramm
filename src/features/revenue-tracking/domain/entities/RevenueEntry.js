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

  constructor({
    id = null,
    employeeId,
    customerNumber,
    customerName,
    customerAddress = null,
    category,
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
    });
  }
}
