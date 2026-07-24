/**
 * Value Object: KnowledgeStatus
 * Status for knowledge board entries (active/inactive)
 * Enables soft-delete for historical data preservation
 */

export const KNOWLEDGE_STATUS_TYPES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export class KnowledgeStatus {
  #status;

  constructor(status = KNOWLEDGE_STATUS_TYPES.ACTIVE) {
    if (!Object.values(KNOWLEDGE_STATUS_TYPES).includes(status)) {
      throw new Error(`Invalid knowledge status: ${status}`);
    }
    this.#status = status;
  }

  get status() {
    return this.#status;
  }

  get isActive() {
    return this.#status === KNOWLEDGE_STATUS_TYPES.ACTIVE;
  }

  get isInactive() {
    return this.#status === KNOWLEDGE_STATUS_TYPES.INACTIVE;
  }

  activate() {
    return new KnowledgeStatus(KNOWLEDGE_STATUS_TYPES.ACTIVE);
  }

  deactivate() {
    return new KnowledgeStatus(KNOWLEDGE_STATUS_TYPES.INACTIVE);
  }

  toJSON() {
    return this.#status;
  }

  static fromJSON(json) {
    return new KnowledgeStatus(json);
  }

  equals(other) {
    return other instanceof KnowledgeStatus && this.#status === other.status;
  }

  toString() {
    return this.#status;
  }
}
