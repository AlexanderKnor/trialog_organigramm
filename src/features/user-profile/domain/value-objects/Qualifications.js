/**
 * Value Object: Qualifications
 * Professional qualifications and certifications
 */

export class Qualifications {
  #ihkQualifications;
  #ihkRegistrationNumber;
  #certifications;
  #additionalQualifications;

  constructor({
    ihkQualifications = [],
    ihkRegistrationNumber = '',
    certifications = [],
    additionalQualifications = '',
  } = {}) {
    this.#ihkQualifications = Array.isArray(ihkQualifications) ? ihkQualifications : [];
    this.#ihkRegistrationNumber = ihkRegistrationNumber;
    this.#certifications = Array.isArray(certifications) ? certifications : [];
    this.#additionalQualifications = additionalQualifications;
  }

  get ihkQualifications() {
    return [...this.#ihkQualifications];
  }

  get ihkRegistrationNumber() {
    return this.#ihkRegistrationNumber;
  }

  get certifications() {
    return [...this.#certifications];
  }

  get additionalQualifications() {
    return this.#additionalQualifications;
  }

  get hasIHKQualifications() {
    return this.#ihkQualifications.length > 0 || Boolean(this.#ihkRegistrationNumber);
  }

  get isEmpty() {
    return (
      this.#ihkQualifications.length === 0 &&
      !this.#ihkRegistrationNumber &&
      this.#certifications.length === 0 &&
      !this.#additionalQualifications
    );
  }

  addIHKQualification(qualification) {
    if (!this.#ihkQualifications.includes(qualification)) {
      this.#ihkQualifications.push(qualification);
    }
    return this;
  }

  removeIHKQualification(qualification) {
    this.#ihkQualifications = this.#ihkQualifications.filter(q => q !== qualification);
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
      ihkRegistrationNumber: this.#ihkRegistrationNumber,
      certifications: [...this.#certifications],
      additionalQualifications: this.#additionalQualifications,
    };
  }

  static fromJSON(json) {
    if (!json) return new Qualifications();

    return new Qualifications({
      ihkQualifications: json.ihkQualifications || [],
      ihkRegistrationNumber: json.ihkRegistrationNumber || '',
      certifications: json.certifications || [],
      additionalQualifications: json.additionalQualifications || '',
    });
  }

  static empty() {
    return new Qualifications();
  }
}

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
