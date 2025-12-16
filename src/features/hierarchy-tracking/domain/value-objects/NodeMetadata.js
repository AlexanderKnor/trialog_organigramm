/**
 * Value Object: NodeMetadata
 * Represents metadata associated with a hierarchy node
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { getCurrentTimestamp } from '../../../../core/utils/index.js';

export class NodeMetadata {
  #createdAt;
  #updatedAt;
  #createdBy;
  #tags;
  #customFields;

  constructor({ createdAt, updatedAt, createdBy = null, tags = [], customFields = {} } = {}) {
    this.#createdAt = createdAt || getCurrentTimestamp();
    this.#updatedAt = updatedAt || this.#createdAt;
    this.#createdBy = createdBy;
    this.#tags = Object.freeze([...tags]);
    this.#customFields = Object.freeze({ ...customFields });
    Object.freeze(this);
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  get createdBy() {
    return this.#createdBy;
  }

  get tags() {
    return [...this.#tags];
  }

  get customFields() {
    return { ...this.#customFields };
  }

  withUpdatedTimestamp() {
    return new NodeMetadata({
      createdAt: this.#createdAt,
      updatedAt: getCurrentTimestamp(),
      createdBy: this.#createdBy,
      tags: this.#tags,
      customFields: this.#customFields,
    });
  }

  withTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array');
    }
    return new NodeMetadata({
      createdAt: this.#createdAt,
      updatedAt: getCurrentTimestamp(),
      createdBy: this.#createdBy,
      tags,
      customFields: this.#customFields,
    });
  }

  withCustomField(key, value) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new ValidationError('Custom field key must be a non-empty string');
    }
    return new NodeMetadata({
      createdAt: this.#createdAt,
      updatedAt: getCurrentTimestamp(),
      createdBy: this.#createdBy,
      tags: this.#tags,
      customFields: { ...this.#customFields, [key]: value },
    });
  }

  toJSON() {
    return {
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      createdBy: this.#createdBy,
      tags: [...this.#tags],
      customFields: { ...this.#customFields },
    };
  }

  static fromJSON(json) {
    return new NodeMetadata(json);
  }
}
