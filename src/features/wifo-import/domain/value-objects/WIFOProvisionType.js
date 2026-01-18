/**
 * Value Object: WIFOProvisionType
 * Maps WIFO provision types (AP, BP) to internal categories
 */

export const WIFO_PROVISION_TYPE = Object.freeze({
  AP: 'AP', // Abschlussprovision (initial commission)
  BP: 'BP', // Bestandsprovision (recurring commission)
});

export const WIFO_PROVISION_TYPE_DISPLAY = Object.freeze({
  [WIFO_PROVISION_TYPE.AP]: 'Abschlussprovision',
  [WIFO_PROVISION_TYPE.BP]: 'Bestandsprovision',
});

export class WIFOProvisionType {
  #type;

  constructor(type) {
    const normalizedType = this.#normalizeType(type);
    if (!Object.values(WIFO_PROVISION_TYPE).includes(normalizedType)) {
      throw new Error(`Invalid WIFO provision type: ${type}`);
    }
    this.#type = normalizedType;
  }

  #normalizeType(type) {
    if (typeof type !== 'string') {
      return type;
    }
    const upper = type.toUpperCase().trim();
    if (upper === 'AP' || upper.startsWith('AP')) {
      return WIFO_PROVISION_TYPE.AP;
    }
    if (upper === 'BP' || upper.startsWith('BP')) {
      return WIFO_PROVISION_TYPE.BP;
    }
    return upper;
  }

  get value() {
    return this.#type;
  }

  get displayName() {
    return WIFO_PROVISION_TYPE_DISPLAY[this.#type];
  }

  get isInitialCommission() {
    return this.#type === WIFO_PROVISION_TYPE.AP;
  }

  get isRecurringCommission() {
    return this.#type === WIFO_PROVISION_TYPE.BP;
  }

  equals(other) {
    if (!(other instanceof WIFOProvisionType)) {
      return false;
    }
    return this.#type === other.value;
  }

  toJSON() {
    return this.#type;
  }

  static fromJSON(json) {
    return new WIFOProvisionType(json);
  }

  static ap() {
    return new WIFOProvisionType(WIFO_PROVISION_TYPE.AP);
  }

  static bp() {
    return new WIFOProvisionType(WIFO_PROVISION_TYPE.BP);
  }

  static tryParse(value) {
    try {
      return new WIFOProvisionType(value);
    } catch {
      return null;
    }
  }
}
