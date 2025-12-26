/**
 * Value Object: LegalInfo
 * Legal business information
 */

export class LegalInfo {
  #legalForm;
  #registrationCourt;
  #commercialRegisterNumber;
  #tradeRegisterNumber;

  constructor({
    legalForm = 'Einzelunternehmer',
    registrationCourt = '',
    commercialRegisterNumber = '',
    tradeRegisterNumber = '',
  } = {}) {
    this.#legalForm = legalForm;
    this.#registrationCourt = registrationCourt;
    this.#commercialRegisterNumber = commercialRegisterNumber;
    this.#tradeRegisterNumber = tradeRegisterNumber;
  }

  get legalForm() {
    return this.#legalForm;
  }

  get registrationCourt() {
    return this.#registrationCourt;
  }

  get commercialRegisterNumber() {
    return this.#commercialRegisterNumber;
  }

  get tradeRegisterNumber() {
    return this.#tradeRegisterNumber;
  }

  get isComplete() {
    return Boolean(this.#legalForm && this.#registrationCourt);
  }

  toJSON() {
    return {
      legalForm: this.#legalForm,
      registrationCourt: this.#registrationCourt,
      commercialRegisterNumber: this.#commercialRegisterNumber,
      tradeRegisterNumber: this.#tradeRegisterNumber,
    };
  }

  static fromJSON(json) {
    if (!json) return new LegalInfo();

    return new LegalInfo({
      legalForm: json.legalForm || 'Einzelunternehmer',
      registrationCourt: json.registrationCourt || '',
      commercialRegisterNumber: json.commercialRegisterNumber || '',
      tradeRegisterNumber: json.tradeRegisterNumber || '',
    });
  }

  static empty() {
    return new LegalInfo();
  }
}

// Legal forms in Germany
export const LEGAL_FORMS = {
  SOLE_PROPRIETOR: 'Einzelunternehmer',
  GMBH: 'GmbH',
  UG: 'UG (haftungsbeschränkt)',
  GBR: 'GbR',
  OHG: 'OHG',
  KG: 'KG',
  AG: 'AG',
  EK: 'e.K.',
};
