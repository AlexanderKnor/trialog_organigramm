/**
 * Entity: ProductDefinition
 * Defines a product within a category
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { CatalogStatus, CATALOG_STATUS_TYPES } from '../value-objects/CatalogStatus.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';

export class ProductDefinition {
  #id;
  #categoryType;
  #name;
  #order;
  #status;
  #metadata;

  constructor({
    id = null,
    categoryType,
    name,
    order = 0,
    status = CATALOG_STATUS_TYPES.ACTIVE,
    metadata = null,
  }) {
    this.#id = id || generateUUID();
    this.#validateCategoryType(categoryType);
    this.#validateName(name);
    this.#validateOrder(order);

    this.#categoryType = categoryType;
    this.#name = name;
    this.#order = order;
    this.#status = status instanceof CatalogStatus ? status : new CatalogStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateCategoryType(categoryType) {
    if (typeof categoryType !== 'string' || categoryType.trim().length === 0) {
      throw new ValidationError('Category type must be a non-empty string', 'categoryType');
    }
  }

  #validateName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Product name must be a non-empty string', 'name');
    }

    if (name.length > 100) {
      throw new ValidationError('Product name must not exceed 100 characters', 'name');
    }
  }

  #validateOrder(order) {
    if (typeof order !== 'number' || order < 0) {
      throw new ValidationError('Order must be a non-negative number', 'order');
    }
  }

  // Getters
  get id() {
    return this.#id;
  }

  get categoryType() {
    return this.#categoryType;
  }

  get name() {
    return this.#name;
  }

  get order() {
    return this.#order;
  }

  get status() {
    return this.#status;
  }

  get metadata() {
    return this.#metadata;
  }

  get isActive() {
    return this.#status.isActive;
  }

  get isInactive() {
    return this.#status.isInactive;
  }

  // Update methods
  updateName(name) {
    this.#validateName(name);
    this.#name = name;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateCategoryType(categoryType) {
    this.#validateCategoryType(categoryType);
    this.#categoryType = categoryType;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateOrder(order) {
    this.#validateOrder(order);
    this.#order = order;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  activate() {
    this.#status = this.#status.activate();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  deactivate() {
    this.#status = this.#status.deactivate();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  // Serialization
  toJSON() {
    return {
      entityType: 'product',
      id: this.#id,
      categoryType: this.#categoryType,
      name: this.#name,
      order: this.#order,
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new ProductDefinition({
      id: json.id,
      categoryType: json.categoryType,
      name: json.name,
      order: json.order ?? 0,
      status: json.status ?? CATALOG_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static create(categoryType, name) {
    return new ProductDefinition({
      categoryType,
      name,
    });
  }
}
