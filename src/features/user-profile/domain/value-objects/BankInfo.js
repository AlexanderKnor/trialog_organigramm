/**
 * Value Object: BankInfo
 * Bank account information with IBAN/BIC validation
 */

import { ValidationError } from '../../../../core/errors/index.js';

export class BankInfo {
  #iban;
  #bic;
  #bankName;
  #accountHolder;

  constructor({
    iban = '',
    bic = '',
    bankName = '',
    accountHolder = '',
  } = {}) {
    this.#iban = this.#validateIBAN(iban);
    this.#bic = this.#validateBIC(bic);
    this.#bankName = bankName;
    this.#accountHolder = accountHolder;
  }

  #validateIBAN(iban) {
    if (!iban) return '';

    // Remove spaces and convert to uppercase
    const cleaned = iban.replace(/\s/g, '').toUpperCase();

    // German IBAN: DE + 2 check digits + 18 digits (total 22 characters)
    if (cleaned && !/^DE\d{20}$/.test(cleaned)) {
      throw new ValidationError('IBAN ungültig (Format: DE + 20 Ziffern)', 'iban');
    }

    // Basic IBAN checksum validation (mod 97)
    if (cleaned) {
      const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
      const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

      // Convert to BigInt for large number mod calculation
      const checksum = BigInt(numeric) % 97n;

      if (checksum !== 1n) {
        throw new ValidationError('IBAN Prüfsumme ungültig', 'iban');
      }
    }

    return cleaned;
  }

  #validateBIC(bic) {
    if (!bic) return '';

    // BIC format: 8 or 11 alphanumeric characters
    const cleaned = bic.replace(/\s/g, '').toUpperCase();
    if (cleaned && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
      throw new ValidationError('BIC ungültig (8 oder 11 Zeichen)', 'bic');
    }

    return cleaned;
  }

  get iban() {
    return this.#iban;
  }

  get ibanFormatted() {
    if (!this.#iban) return '';
    // Format: DE12 3456 7890 1234 5678 90
    return this.#iban.match(/.{1,4}/g)?.join(' ') || this.#iban;
  }

  get bic() {
    return this.#bic;
  }

  get bankName() {
    return this.#bankName;
  }

  get accountHolder() {
    return this.#accountHolder;
  }

  get isComplete() {
    return Boolean(
      this.#iban &&
      this.#bic &&
      this.#bankName &&
      this.#accountHolder
    );
  }

  get isEmpty() {
    return !this.#iban && !this.#bic && !this.#bankName && !this.#accountHolder;
  }

  toJSON() {
    return {
      iban: this.#iban,
      bic: this.#bic,
      bankName: this.#bankName,
      accountHolder: this.#accountHolder,
    };
  }

  static fromJSON(json) {
    if (!json) return new BankInfo();

    return new BankInfo({
      iban: json.iban || '',
      bic: json.bic || '',
      bankName: json.bankName || '',
      accountHolder: json.accountHolder || '',
    });
  }

  static empty() {
    return new BankInfo();
  }
}
