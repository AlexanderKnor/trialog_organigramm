/**
 * Value Object: EntryKind
 * Distinguishes a normal revenue entry from a clawback (Rueckforderung).
 *
 * A clawback represents a manually reclaimed provision and is stored as a
 * RevenueEntry with a negative provisionAmount. The kind is therefore derived
 * from the amount's sign and can never desynchronize from the stored value.
 */

export const ENTRY_KIND_TYPES = {
  REVENUE: 'revenue',
  CLAWBACK: 'clawback',
};

const KIND_DISPLAY_NAMES = {
  [ENTRY_KIND_TYPES.REVENUE]: 'Umsatz',
  [ENTRY_KIND_TYPES.CLAWBACK]: 'Rückforderung',
};

const KIND_COLORS = {
  [ENTRY_KIND_TYPES.REVENUE]: '#16a34a',
  [ENTRY_KIND_TYPES.CLAWBACK]: '#dc2626',
};

export class EntryKind {
  #type;

  constructor(type = ENTRY_KIND_TYPES.REVENUE) {
    if (!Object.values(ENTRY_KIND_TYPES).includes(type)) {
      throw new Error(`Invalid entry kind: ${type}`);
    }
    this.#type = type;
  }

  /**
   * Derive the kind from a monetary amount.
   * Negative amounts are clawbacks, everything else is regular revenue.
   */
  static fromAmount(amount) {
    return new EntryKind(
      typeof amount === 'number' && amount < 0
        ? ENTRY_KIND_TYPES.CLAWBACK
        : ENTRY_KIND_TYPES.REVENUE,
    );
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    return KIND_DISPLAY_NAMES[this.#type] || this.#type;
  }

  get color() {
    return KIND_COLORS[this.#type] || '#6b7280';
  }

  get isClawback() {
    return this.#type === ENTRY_KIND_TYPES.CLAWBACK;
  }

  get isRevenue() {
    return this.#type === ENTRY_KIND_TYPES.REVENUE;
  }

  equals(other) {
    return other instanceof EntryKind && this.#type === other.type;
  }

  toJSON() {
    return this.#type;
  }

  static fromJSON(json) {
    return new EntryKind(json);
  }

  toString() {
    return this.displayName;
  }
}
