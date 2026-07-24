/**
 * Entity: KnowledgeCategory
 * Taxonomy node for knowledge entries.
 *
 * Deliberately separate from the product catalog's CategoryDefinition: that one
 * carries a mandatory provisionType and is referenced by revenue entries, so a
 * knowledge category living there would have to fake revenue semantics.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';
import { KnowledgeStatus, KNOWLEDGE_STATUS_TYPES } from '../value-objects/KnowledgeStatus.js';

const TYPE_PATTERN = /^[a-zA-Z0-9_]+$/;
const MAX_TYPE_LENGTH = 50;
const MAX_DISPLAY_NAME_LENGTH = 100;

export class KnowledgeCategory {
  #id;
  #type;
  #displayName;
  #icon;
  #order;
  #status;
  #metadata;

  constructor({
    id = null,
    type,
    displayName,
    icon = 'folder',
    order = 0,
    status = KNOWLEDGE_STATUS_TYPES.ACTIVE,
    metadata = null,
  }) {
    this.#validateType(type);
    this.#validateDisplayName(displayName);
    this.#validateOrder(order);

    // Deterministic id, mirroring the catalog's `category_${type}`: it makes the
    // category addressable by type without a lookup query.
    this.#id = id || `knowledge_category_${type}`;
    this.#type = type;
    this.#displayName = displayName;
    this.#icon = icon;
    this.#order = order;
    this.#status = status instanceof KnowledgeStatus ? status : new KnowledgeStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateType(type) {
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new ValidationError('Category type must be a non-empty string', 'type');
    }

    if (!TYPE_PATTERN.test(type)) {
      throw new ValidationError(
        'Category type must be alphanumeric (letters, numbers, underscores only)',
        'type'
      );
    }

    if (type.length > MAX_TYPE_LENGTH) {
      throw new ValidationError(`Category type must not exceed ${MAX_TYPE_LENGTH} characters`, 'type');
    }
  }

  #validateDisplayName(displayName) {
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      throw new ValidationError('Display name must be a non-empty string', 'displayName');
    }

    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(
        `Display name must not exceed ${MAX_DISPLAY_NAME_LENGTH} characters`,
        'displayName'
      );
    }
  }

  #validateOrder(order) {
    if (typeof order !== 'number' || order < 0) {
      throw new ValidationError('Order must be a non-negative number', 'order');
    }
  }

  get id() {
    return this.#id;
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    return this.#displayName;
  }

  get icon() {
    return this.#icon;
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

  updateDisplayName(displayName) {
    this.#validateDisplayName(displayName);
    this.#displayName = displayName;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateIcon(icon) {
    this.#icon = icon;
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

  toJSON() {
    return {
      entityType: 'knowledge_category',
      id: this.#id,
      type: this.#type,
      displayName: this.#displayName,
      icon: this.#icon,
      order: this.#order,
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new KnowledgeCategory({
      id: json.id,
      type: json.type,
      displayName: json.displayName,
      icon: json.icon ?? 'folder',
      order: json.order ?? 0,
      status: json.status ?? KNOWLEDGE_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static create(type, displayName, icon = 'folder') {
    return new KnowledgeCategory({ type, displayName, icon });
  }
}
