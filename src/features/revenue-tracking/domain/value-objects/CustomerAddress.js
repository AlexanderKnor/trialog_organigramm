/**
 * Value Object: CustomerAddress
 * Represents a customer's address
 */

export class CustomerAddress {
  #street;
  #houseNumber;
  #postalCode;
  #city;
  #additionalInfo;

  constructor({
    street = '',
    houseNumber = '',
    postalCode = '',
    city = '',
    additionalInfo = '',
  }) {
    this.#street = street;
    this.#houseNumber = houseNumber;
    this.#postalCode = postalCode;
    this.#city = city;
    this.#additionalInfo = additionalInfo;
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

  get additionalInfo() {
    return this.#additionalInfo;
  }

  get isEmpty() {
    return !this.#street && !this.#postalCode && !this.#city;
  }

  get isComplete() {
    return this.#street && this.#postalCode && this.#city;
  }

  get formatted() {
    const parts = [];

    if (this.#street) {
      if (this.#houseNumber) {
        parts.push(`${this.#street} ${this.#houseNumber}`);
      } else {
        parts.push(this.#street);
      }
    }

    if (this.#postalCode && this.#city) {
      parts.push(`${this.#postalCode} ${this.#city}`);
    }

    if (this.#additionalInfo) {
      parts.push(this.#additionalInfo);
    }

    return parts.join(', ');
  }

  get multiline() {
    const lines = [];

    if (this.#street) {
      if (this.#houseNumber) {
        lines.push(`${this.#street} ${this.#houseNumber}`);
      } else {
        lines.push(this.#street);
      }
    }

    if (this.#postalCode && this.#city) {
      lines.push(`${this.#postalCode} ${this.#city}`);
    }

    if (this.#additionalInfo) {
      lines.push(this.#additionalInfo);
    }

    return lines.join('\n');
  }

  static empty() {
    return new CustomerAddress({});
  }

  copyWith(updates) {
    return new CustomerAddress({
      street: updates.street ?? this.#street,
      houseNumber: updates.houseNumber ?? this.#houseNumber,
      postalCode: updates.postalCode ?? this.#postalCode,
      city: updates.city ?? this.#city,
      additionalInfo: updates.additionalInfo ?? this.#additionalInfo,
    });
  }

  toJSON() {
    return {
      street: this.#street,
      houseNumber: this.#houseNumber,
      postalCode: this.#postalCode,
      city: this.#city,
      additionalInfo: this.#additionalInfo,
    };
  }

  static fromJSON(json) {
    return new CustomerAddress({
      street: json.street || '',
      houseNumber: json.houseNumber || '',
      postalCode: json.postalCode || '',
      city: json.city || '',
      additionalInfo: json.additionalInfo || '',
    });
  }

  toString() {
    return this.formatted;
  }
}
