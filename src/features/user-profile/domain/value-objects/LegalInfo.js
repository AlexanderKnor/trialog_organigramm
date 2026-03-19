/**
 * Value Object: LegalInfo
 * Legal business information
 */

// Legal forms in Germany
export const LEGAL_FORMS = {
  ANGESTELLTER: 'Angestellte/r',
  EINZELUNTERNEHMEN: 'Einzelunternehmen',
  GMBH: 'GmbH',
  GMBH_CO_KG: 'GmbH & Co. KG',
  UG: 'UG (haftungsbeschränkt)',
  EK: 'e.K.',
  GBR: 'GbR',
  EGBR: 'eGbR',
};

const COMPANY_FORMS = new Set([
  LEGAL_FORMS.GMBH,
  LEGAL_FORMS.GMBH_CO_KG,
  LEGAL_FORMS.UG,
  LEGAL_FORMS.EK,
  LEGAL_FORMS.GBR,
  LEGAL_FORMS.EGBR,
]);

export class LegalInfo {
  #legalForm;
  #foundingDate;
  #registrationCourt;
  #commercialRegisterNumber;
  #tradeRegisterNumber;

  constructor({
    legalForm = LEGAL_FORMS.EINZELUNTERNEHMEN,
    foundingDate = null,
    registrationCourt = '',
    commercialRegisterNumber = '',
    tradeRegisterNumber = '',
  } = {}) {
    this.#legalForm = legalForm;
    this.#foundingDate = foundingDate ? new Date(foundingDate) : null;
    this.#registrationCourt = registrationCourt;
    this.#commercialRegisterNumber = commercialRegisterNumber;
    this.#tradeRegisterNumber = tradeRegisterNumber;
  }

  get legalForm() {
    return this.#legalForm;
  }

  get foundingDate() {
    return this.#foundingDate;
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

  get isCompanyForm() {
    return LegalInfo.isCompanyForm(this.#legalForm);
  }

  get isComplete() {
    return Boolean(this.#legalForm && this.#registrationCourt);
  }

  toJSON() {
    return {
      legalForm: this.#legalForm,
      foundingDate: this.#foundingDate && !isNaN(this.#foundingDate.getTime())
        ? this.#foundingDate.toISOString()
        : null,
      registrationCourt: this.#registrationCourt,
      commercialRegisterNumber: this.#commercialRegisterNumber,
      tradeRegisterNumber: this.#tradeRegisterNumber,
    };
  }

  static fromJSON(json) {
    if (!json) return new LegalInfo();

    let legalForm = json.legalForm || LEGAL_FORMS.EINZELUNTERNEHMEN;
    // Backward compatibility: old value → new value
    if (legalForm === 'Einzelunternehmer') legalForm = LEGAL_FORMS.EINZELUNTERNEHMEN;

    return new LegalInfo({
      legalForm,
      foundingDate: json.foundingDate || null,
      registrationCourt: json.registrationCourt || '',
      commercialRegisterNumber: json.commercialRegisterNumber || '',
      tradeRegisterNumber: json.tradeRegisterNumber || '',
    });
  }

  static empty() {
    return new LegalInfo();
  }

  static isCompanyForm(legalForm) {
    return COMPANY_FORMS.has(legalForm);
  }

  static isEmployeeForm(legalForm) {
    return legalForm === LEGAL_FORMS.ANGESTELLTER;
  }
}
