/**
 * Value Object: RevenueStatus
 * Represents the approval status of a revenue entry
 */

export const REVENUE_STATUS_TYPES = {
  SUBMITTED: 'submitted',
  PROVISIONED: 'provisioned',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const STATUS_DISPLAY_NAMES = {
  [REVENUE_STATUS_TYPES.SUBMITTED]: 'Eingereicht',
  [REVENUE_STATUS_TYPES.PROVISIONED]: 'Provisioniert',
  [REVENUE_STATUS_TYPES.REJECTED]: 'Abgelehnt',
  [REVENUE_STATUS_TYPES.CANCELLED]: 'Storniert',
};

const STATUS_COLORS = {
  [REVENUE_STATUS_TYPES.SUBMITTED]: '#f59e0b',
  [REVENUE_STATUS_TYPES.PROVISIONED]: '#16a34a',
  [REVENUE_STATUS_TYPES.REJECTED]: '#dc2626',
  [REVENUE_STATUS_TYPES.CANCELLED]: '#6b7280',
};

export class RevenueStatus {
  #type;

  constructor(type = REVENUE_STATUS_TYPES.SUBMITTED) {
    if (!Object.values(REVENUE_STATUS_TYPES).includes(type)) {
      throw new Error(`Invalid status type: ${type}`);
    }
    this.#type = type;
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    return STATUS_DISPLAY_NAMES[this.#type] || this.#type;
  }

  get color() {
    return STATUS_COLORS[this.#type] || '#6b7280';
  }

  get isSubmitted() {
    return this.#type === REVENUE_STATUS_TYPES.SUBMITTED;
  }

  get isProvisioned() {
    return this.#type === REVENUE_STATUS_TYPES.PROVISIONED;
  }

  get isRejected() {
    return this.#type === REVENUE_STATUS_TYPES.REJECTED;
  }

  get isCancelled() {
    return this.#type === REVENUE_STATUS_TYPES.CANCELLED;
  }

  get isPending() {
    return this.#type === REVENUE_STATUS_TYPES.SUBMITTED;
  }

  get isResolved() {
    return this.#type !== REVENUE_STATUS_TYPES.SUBMITTED;
  }

  /**
   * Check if this status excludes the entry from calculations
   * (rejected and cancelled entries are not counted)
   */
  get isExcludedFromCalculations() {
    return this.#type === REVENUE_STATUS_TYPES.REJECTED ||
           this.#type === REVENUE_STATUS_TYPES.CANCELLED;
  }

  static get allStatuses() {
    return Object.values(REVENUE_STATUS_TYPES).map(
      (type) => new RevenueStatus(type),
    );
  }

  /**
   * Statuses that Trialog (company) can set
   */
  static get companyEditableStatuses() {
    return [
      new RevenueStatus(REVENUE_STATUS_TYPES.SUBMITTED),
      new RevenueStatus(REVENUE_STATUS_TYPES.PROVISIONED),
      new RevenueStatus(REVENUE_STATUS_TYPES.REJECTED),
    ];
  }

  /**
   * Statuses that employees can set on their own entries
   */
  static get employeeEditableStatuses() {
    return [
      new RevenueStatus(REVENUE_STATUS_TYPES.CANCELLED),
    ];
  }

  static fromString(value) {
    return new RevenueStatus(value);
  }

  toJSON() {
    return this.#type;
  }

  static fromJSON(json) {
    return new RevenueStatus(json);
  }

  equals(other) {
    return other instanceof RevenueStatus && this.#type === other.type;
  }

  toString() {
    return this.displayName;
  }
}
