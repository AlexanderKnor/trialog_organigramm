/**
 * Entity: CategoryDefinition
 * Defines a revenue category with metadata
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { ProvisionType } from '../value-objects/ProvisionType.js';
import { CatalogStatus, CATALOG_STATUS_TYPES } from '../value-objects/CatalogStatus.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';

export class CategoryDefinition {
  #id;
  #type;
  #displayName;
  #provisionType;
  #requiresPropertyAddress;
  #order;
  #status;
  #metadata;

  constructor({
    id = null,
    type,
    displayName,
    provisionType,
    requiresPropertyAddress = false,
    order = 0,
    status = CATALOG_STATUS_TYPES.ACTIVE,
    metadata = null,
  }) {
    this.#id = id || `category_${type}`;
    this.#validateType(type);
    this.#validateDisplayName(displayName);
    this.#validateOrder(order);

    this.#type = type;
    this.#displayName = displayName;
    this.#provisionType = provisionType instanceof ProvisionType ? provisionType : new ProvisionType(provisionType);
    this.#requiresPropertyAddress = Boolean(requiresPropertyAddress);
    this.#order = order;
    this.#status = status instanceof CatalogStatus ? status : new CatalogStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateType(type) {
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new ValidationError('Category type must be a non-empty string', 'type');
    }

    // Type must be alphanumeric (camelCase or snake_case allowed)
    // Examples: 'bank', 'realEstate', 'real_estate'
    const typePattern = /^[a-zA-Z0-9_]+$/;
    if (!typePattern.test(type)) {
      throw new ValidationError(
        'Category type must be alphanumeric (letters, numbers, underscores only)',
        'type'
      );
    }

    if (type.length > 50) {
      throw new ValidationError('Category type must not exceed 50 characters', 'type');
    }
  }

  #validateDisplayName(displayName) {
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      throw new ValidationError('Display name must be a non-empty string', 'displayName');
    }

    if (displayName.length > 100) {
      throw new ValidationError('Display name must not exceed 100 characters', 'displayName');
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

  get type() {
    return this.#type;
  }

  get displayName() {
    return this.#displayName;
  }

  get provisionType() {
    return this.#provisionType;
  }

  get requiresPropertyAddress() {
    return this.#requiresPropertyAddress;
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
  updateDisplayName(displayName) {
    this.#validateDisplayName(displayName);
    this.#displayName = displayName;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateProvisionType(provisionType) {
    this.#provisionType = provisionType instanceof ProvisionType ? provisionType : new ProvisionType(provisionType);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateRequiresPropertyAddress(requiresPropertyAddress) {
    this.#requiresPropertyAddress = Boolean(requiresPropertyAddress);
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
      entityType: 'category',
      id: this.#id,
      type: this.#type,
      displayName: this.#displayName,
      provisionType: this.#provisionType.toJSON(),
      requiresPropertyAddress: this.#requiresPropertyAddress,
      order: this.#order,
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new CategoryDefinition({
      id: json.id,
      type: json.type,
      displayName: json.displayName,
      provisionType: json.provisionType,
      requiresPropertyAddress: json.requiresPropertyAddress ?? false,
      order: json.order ?? 0,
      status: json.status ?? CATALOG_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static create(type, displayName, provisionType) {
    return new CategoryDefinition({
      type,
      displayName,
      provisionType,
    });
  }
}
