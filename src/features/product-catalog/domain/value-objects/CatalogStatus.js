/**
 * Value Object: CatalogStatus
 * Status for catalog entries (active/inactive)
 * Enables soft-delete for historical data preservation
 */

export const CATALOG_STATUS_TYPES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export class CatalogStatus {
  #status;

  constructor(status = CATALOG_STATUS_TYPES.ACTIVE) {
    if (!Object.values(CATALOG_STATUS_TYPES).includes(status)) {
      throw new Error(`Invalid catalog status: ${status}`);
    }
    this.#status = status;
  }

  get status() {
    return this.#status;
  }

  get isActive() {
    return this.#status === CATALOG_STATUS_TYPES.ACTIVE;
  }

  get isInactive() {
    return this.#status === CATALOG_STATUS_TYPES.INACTIVE;
  }

  activate() {
    return new CatalogStatus(CATALOG_STATUS_TYPES.ACTIVE);
  }

  deactivate() {
    return new CatalogStatus(CATALOG_STATUS_TYPES.INACTIVE);
  }

  toJSON() {
    return this.#status;
  }

  static fromJSON(json) {
    return new CatalogStatus(json);
  }

  equals(other) {
    return other instanceof CatalogStatus && this.#status === other.status;
  }

  toString() {
    return this.#status;
  }
}
