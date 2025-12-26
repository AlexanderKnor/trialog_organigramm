/**
 * Value Object: Address
 * Represents a complete address with validation
 */

import { ValidationError } from '../../../../core/errors/index.js';

export class Address {
  #street;
  #houseNumber;
  #postalCode;
  #city;
  #country;
  #additionalInfo;

  constructor({
    street = '',
    houseNumber = '',
    postalCode = '',
    city = '',
    country = 'Deutschland',
    additionalInfo = '',
  } = {}) {
    this.#street = street;
    this.#houseNumber = houseNumber;
    this.#postalCode = this.#validatePostalCode(postalCode);
    this.#city = city;
    this.#country = country;
    this.#additionalInfo = additionalInfo;
  }

  #validatePostalCode(postalCode) {
    if (!postalCode) return '';

    // German postal code: 5 digits
    const cleaned = postalCode.replace(/\s/g, '');
    if (cleaned && !/^\d{5}$/.test(cleaned)) {
      throw new ValidationError('PLZ muss 5 Ziffern haben', 'postalCode');
    }
    return cleaned;
  }

  get street() {
    return this.#street;
  }

  get houseNumber() {
    return this.#houseNumber;
  }

  get postalCode() {
    return this.#postalCode;
  }

  get city() {
    return this.#city;
  }

  get country() {
    return this.#country;
  }

  get additionalInfo() {
    return this.#additionalInfo;
  }

  get formatted() {
    const parts = [];

    if (this.#street) {
      const streetLine = this.#houseNumber
        ? `${this.#street} ${this.#houseNumber}`
        : this.#street;
      parts.push(streetLine);
    }

    if (this.#postalCode || this.#city) {
      const cityLine = [this.#postalCode, this.#city].filter(Boolean).join(' ');
      parts.push(cityLine);
    }

    if (this.#country && this.#country !== 'Deutschland') {
      parts.push(this.#country);
    }

    return parts.join(', ');
  }

  get isComplete() {
    return Boolean(
      this.#street &&
      this.#houseNumber &&
      this.#postalCode &&
      this.#city
    );
  }

  get isEmpty() {
    return !this.#street && !this.#houseNumber && !this.#postalCode && !this.#city;
  }

  toJSON() {
    return {
      street: this.#street,
      houseNumber: this.#houseNumber,
      postalCode: this.#postalCode,
      city: this.#city,
      country: this.#country,
      additionalInfo: this.#additionalInfo,
    };
  }

  static fromJSON(json) {
    if (!json) return new Address();

    return new Address({
      street: json.street || '',
      houseNumber: json.houseNumber || '',
      postalCode: json.postalCode || '',
      city: json.city || '',
      country: json.country || 'Deutschland',
      additionalInfo: json.additionalInfo || '',
    });
  }

  static empty() {
    return new Address();
  }
}
