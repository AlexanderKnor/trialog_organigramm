/**
 * Entity: ProviderDefinition
 * Defines a product provider (Produktgeber) for a specific product
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { CatalogStatus, CATALOG_STATUS_TYPES } from '../value-objects/CatalogStatus.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';

export class ProviderDefinition {
  #id;
  #productId;
  #name;
  #order;
  #status;
  #metadata;

  constructor({
    id = null,
    productId,
    name,
    order = 0,
    status = CATALOG_STATUS_TYPES.ACTIVE,
    metadata = null,
  }) {
    this.#id = id || generateUUID();
    this.#validateProductId(productId);
    this.#validateName(name);
    this.#validateOrder(order);

    this.#productId = productId;
    this.#name = name;
    this.#order = order;
    this.#status = status instanceof CatalogStatus ? status : new CatalogStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateProductId(productId) {
    if (typeof productId !== 'string' || productId.trim().length === 0) {
      throw new ValidationError('Product ID must be a non-empty string', 'productId');
    }
  }

  #validateName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Provider name must be a non-empty string', 'name');
    }

    if (name.length > 200) {
      throw new ValidationError('Provider name must not exceed 200 characters', 'name');
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

  get productId() {
    return this.#productId;
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
      entityType: 'provider',
      id: this.#id,
      productId: this.#productId,
      name: this.#name,
      order: this.#order,
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new ProviderDefinition({
      id: json.id,
      productId: json.productId,
      name: json.name,
      order: json.order ?? 0,
      status: json.status ?? CATALOG_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static create(productId, name) {
    return new ProviderDefinition({
      productId,
      name,
    });
  }
}
