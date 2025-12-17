/**
 * Value Object: ProvisionType
 * Maps catalog categories to existing HierarchyNode provision fields
 */

export const PROVISION_TYPES = {
  BANK: 'bank',
  INSURANCE: 'insurance',
  REAL_ESTATE: 'realEstate',
};

const PROVISION_DISPLAY_NAMES = {
  [PROVISION_TYPES.BANK]: 'Bank-Provision',
  [PROVISION_TYPES.INSURANCE]: 'Versicherungs-Provision',
  [PROVISION_TYPES.REAL_ESTATE]: 'Immobilien-Provision',
};

const PROVISION_FIELD_MAPPING = {
  [PROVISION_TYPES.BANK]: 'bankProvision',
  [PROVISION_TYPES.INSURANCE]: 'insuranceProvision',
  [PROVISION_TYPES.REAL_ESTATE]: 'realEstateProvision',
};

export class ProvisionType {
  #type;

  constructor(type) {
    if (!Object.values(PROVISION_TYPES).includes(type)) {
      throw new Error(`Invalid provision type: ${type}`);
    }
    this.#type = type;
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    return PROVISION_DISPLAY_NAMES[this.#type] || this.#type;
  }

  get fieldName() {
    return PROVISION_FIELD_MAPPING[this.#type];
  }

  static get allTypes() {
    return Object.values(PROVISION_TYPES).map((type) => new ProvisionType(type));
  }

  toJSON() {
    return this.#type;
  }

  static fromJSON(json) {
    return new ProvisionType(json);
  }

  equals(other) {
    return other instanceof ProvisionType && this.#type === other.type;
  }

  toString() {
    return this.displayName;
  }
}
