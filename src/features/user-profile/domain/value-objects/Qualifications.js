/**
 * Value Object: Qualifications
 * Professional qualifications and certifications
 */

// Common IHK Qualifications
export const IHK_QUALIFICATIONS = {
  INSURANCE_BROKER: 'Versicherungsmakler (§34d GewO)',
  INSURANCE_AGENT: 'Versicherungsvertreter (§34d GewO)',
  FINANCIAL_INVESTMENT_BROKER: 'Finanzanlagenvermittler (§34f GewO)',
  FINANCIAL_ADVISOR: 'Honorar-Finanzanlagenberater (§34h GewO)',
  REAL_ESTATE_BROKER: 'Immobilienmakler (§34c GewO)',
  MORTGAGE_BROKER: 'Darlehensvermittler (§34c GewO)',
  REAL_ESTATE_LOAN_BROKER: 'Immobiliardarlehensvermittler (§34i GewO)',
  BUILDING_FINANCE_ADVISOR: 'Baufinanzierungsberater',
};

/**
 * Qualifications that require a separate registration number (Vermittlernummer).
 */
export const QUALIFICATIONS_REQUIRING_REGISTRATION = new Set([
  IHK_QUALIFICATIONS.INSURANCE_BROKER,
  IHK_QUALIFICATIONS.INSURANCE_AGENT,
  IHK_QUALIFICATIONS.FINANCIAL_INVESTMENT_BROKER,
  IHK_QUALIFICATIONS.REAL_ESTATE_LOAN_BROKER,
]);

export class Qualifications {
  #ihkQualifications;
  #registrationNumbers;
  #certifications;
  #additionalQualifications;

  constructor({
    ihkQualifications = [],
    registrationNumbers = {},
    ihkRegistrationNumber = '',
    certifications = [],
    additionalQualifications = '',
  } = {}) {
    this.#ihkQualifications = Array.isArray(ihkQualifications) ? ihkQualifications : [];
    this.#registrationNumbers = registrationNumbers && typeof registrationNumbers === 'object'
      ? { ...registrationNumbers }
      : {};
    this.#certifications = Array.isArray(certifications) ? certifications : [];
    this.#additionalQualifications = additionalQualifications;

    // Backward compatibility: migrate single ihkRegistrationNumber
    // Only if registrationNumbers is empty and old field has a value
    if (ihkRegistrationNumber && Object.keys(this.#registrationNumbers).length === 0) {
      // Assign to each active qualification that requires registration
      for (const qual of this.#ihkQualifications) {
        if (QUALIFICATIONS_REQUIRING_REGISTRATION.has(qual)) {
          this.#registrationNumbers[qual] = ihkRegistrationNumber;
        }
      }
    }
  }

  get ihkQualifications() {
    return [...this.#ihkQualifications];
  }

  get registrationNumbers() {
    return { ...this.#registrationNumbers };
  }

  /**
   * @deprecated Use getRegistrationNumber(qualification) instead
   */
  get ihkRegistrationNumber() {
    // Return first non-empty registration number for backward compat
    for (const qual of this.#ihkQualifications) {
      if (this.#registrationNumbers[qual]) {
        return this.#registrationNumbers[qual];
      }
    }
    return '';
  }

  get certifications() {
    return [...this.#certifications];
  }

  get additionalQualifications() {
    return this.#additionalQualifications;
  }

  get hasIHKQualifications() {
    return this.#ihkQualifications.length > 0 || Object.keys(this.#registrationNumbers).length > 0;
  }

  get isEmpty() {
    return (
      this.#ihkQualifications.length === 0 &&
      Object.keys(this.#registrationNumbers).length === 0 &&
      this.#certifications.length === 0 &&
      !this.#additionalQualifications
    );
  }

  getRegistrationNumber(qualification) {
    return this.#registrationNumbers[qualification] || '';
  }

  addIHKQualification(qualification) {
    if (!this.#ihkQualifications.includes(qualification)) {
      this.#ihkQualifications.push(qualification);
    }
    return this;
  }

  removeIHKQualification(qualification) {
    this.#ihkQualifications = this.#ihkQualifications.filter(q => q !== qualification);
    delete this.#registrationNumbers[qualification];
    return this;
  }

  addCertification(certification) {
    if (!this.#certifications.includes(certification)) {
      this.#certifications.push(certification);
    }
    return this;
  }

  removeCertification(certification) {
    this.#certifications = this.#certifications.filter(c => c !== certification);
    return this;
  }

  toJSON() {
    return {
      ihkQualifications: [...this.#ihkQualifications],
      registrationNumbers: { ...this.#registrationNumbers },
      certifications: [...this.#certifications],
      additionalQualifications: this.#additionalQualifications,
    };
  }

  static fromJSON(json) {
    if (!json) return new Qualifications();

    return new Qualifications({
      ihkQualifications: json.ihkQualifications || [],
      registrationNumbers: json.registrationNumbers || {},
      ihkRegistrationNumber: json.ihkRegistrationNumber || '',
      certifications: json.certifications || [],
      additionalQualifications: json.additionalQualifications || '',
    });
  }

  static empty() {
    return new Qualifications();
  }
}
