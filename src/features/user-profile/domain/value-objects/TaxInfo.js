/**
 * Value Object: TaxInfo
 * Tax-related information for employee profile
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { Logger } from './../../../../core/utils/logger.js';

export class TaxInfo {
  #taxNumber;
  #taxId;
  #vatNumber;
  #taxOffice;
  #isSmallBusiness;
  #isVatLiable;

  constructor({
    taxNumber = '',
    taxId = '',
    vatNumber = '',
    taxOffice = '',
    isSmallBusiness = false,
    isVatLiable = true,
  } = {}) {
    this.#taxNumber = this.#validateTaxNumber(taxNumber);
    this.#taxId = this.#validateTaxId(taxId);
    this.#vatNumber = this.#validateVatNumber(vatNumber);
    this.#taxOffice = taxOffice;
    this.#isSmallBusiness = Boolean(isSmallBusiness);
    this.#isVatLiable = Boolean(isVatLiable);

    // Business Rule: Small businesses are typically not VAT liable
    if (this.#isSmallBusiness && this.#isVatLiable) {
      Logger.warn('Warning: Small business (Kleinunternehmer) is typically not VAT liable');
    }
  }

  #validateTaxNumber(taxNumber) {
    if (!taxNumber) return '';

    // German tax number format: 10-13 digits with optional slashes
    const cleaned = taxNumber.replace(/[\s\-\/]/g, '');
    if (cleaned && (cleaned.length < 10 || cleaned.length > 13 || !/^\d+$/.test(cleaned))) {
      throw new ValidationError('Steuernummer ungültig (10-13 Ziffern)', 'taxNumber');
    }
    return taxNumber;
  }

  #validateTaxId(taxId) {
    if (!taxId) return '';

    // German tax ID (Steueridentifikationsnummer): exactly 11 digits
    const cleaned = taxId.replace(/[\s\-]/g, '');
    if (cleaned && (cleaned.length !== 11 || !/^\d+$/.test(cleaned))) {
      throw new ValidationError('Steuer-ID ungültig (11 Ziffern)', 'taxId');
    }
    return taxId;
  }

  #validateVatNumber(vatNumber) {
    if (!vatNumber) return '';

    // German VAT number format: DE + 9 digits
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
    if (cleaned && !/^DE\d{9}$/.test(cleaned)) {
      throw new ValidationError('Ust-Nr ungültig (Format: DE123456789)', 'vatNumber');
    }
    return cleaned;
  }

  get taxNumber() {
    return this.#taxNumber;
  }

  get taxId() {
    return this.#taxId;
  }

  get vatNumber() {
    return this.#vatNumber;
  }

  get taxOffice() {
    return this.#taxOffice;
  }

  get isSmallBusiness() {
    return this.#isSmallBusiness;
  }

  get isVatLiable() {
    return this.#isVatLiable;
  }

  get isComplete() {
    return Boolean(
      this.#taxNumber &&
      this.#taxOffice &&
      (this.#isSmallBusiness || this.#vatNumber)
    );
  }

  toJSON() {
    return {
      taxNumber: this.#taxNumber,
      taxId: this.#taxId,
      vatNumber: this.#vatNumber,
      taxOffice: this.#taxOffice,
      isSmallBusiness: this.#isSmallBusiness,
      isVatLiable: this.#isVatLiable,
    };
  }

  static fromJSON(json) {
    if (!json) return new TaxInfo();

    return new TaxInfo({
      taxNumber: json.taxNumber || '',
      taxId: json.taxId || '',
      vatNumber: json.vatNumber || '',
      taxOffice: json.taxOffice || '',
      isSmallBusiness: json.isSmallBusiness ?? false,
      isVatLiable: json.isVatLiable ?? true,
    });
  }

  static empty() {
    return new TaxInfo();
  }
}
