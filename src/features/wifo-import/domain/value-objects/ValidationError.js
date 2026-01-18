/**
 * Value Object: ValidationError
 * Represents a validation error for a WIFO import record
 */

export const VALIDATION_ERROR_SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

export const VALIDATION_ERROR_CODE = Object.freeze({
  MISSING_REQUIRED_FIELD: 'missingRequiredField',
  INVALID_DATE_FORMAT: 'invalidDateFormat',
  INVALID_NUMBER_FORMAT: 'invalidNumberFormat',
  UNKNOWN_AGENT: 'unknownAgent',
  UNKNOWN_CATEGORY: 'unknownCategory',
  DUPLICATE_ENTRY: 'duplicateEntry',
  NEGATIVE_AMOUNT: 'negativeAmount',
  FUTURE_DATE: 'futureDate',
  INVALID_PROVISION_TYPE: 'invalidProvisionType',
  AMOUNT_MISMATCH: 'amountMismatch',
  UNKNOWN_PROVIDER: 'unknownProvider',
  FUZZY_MATCH: 'fuzzyMatch',
  POTENTIAL_DUPLICATE: 'potentialDuplicate',
});

export const VALIDATION_ERROR_MESSAGES = Object.freeze({
  [VALIDATION_ERROR_CODE.MISSING_REQUIRED_FIELD]: 'Pflichtfeld fehlt',
  [VALIDATION_ERROR_CODE.INVALID_DATE_FORMAT]: 'Ungültiges Datumsformat',
  [VALIDATION_ERROR_CODE.INVALID_NUMBER_FORMAT]: 'Ungültiges Zahlenformat',
  [VALIDATION_ERROR_CODE.UNKNOWN_AGENT]: 'Vermittler nicht gefunden',
  [VALIDATION_ERROR_CODE.UNKNOWN_CATEGORY]: 'Unbekannte Kategorie/Sparte',
  [VALIDATION_ERROR_CODE.DUPLICATE_ENTRY]: 'Eintrag bereits vorhanden',
  [VALIDATION_ERROR_CODE.NEGATIVE_AMOUNT]: 'Negativer Betrag',
  [VALIDATION_ERROR_CODE.FUTURE_DATE]: 'Datum liegt in der Zukunft',
  [VALIDATION_ERROR_CODE.INVALID_PROVISION_TYPE]: 'Ungültige Provisionsart',
  [VALIDATION_ERROR_CODE.AMOUNT_MISMATCH]: 'Beträge stimmen nicht überein',
  [VALIDATION_ERROR_CODE.UNKNOWN_PROVIDER]: 'Anbieter nicht gefunden',
  [VALIDATION_ERROR_CODE.FUZZY_MATCH]: 'Mitarbeiter durch Ähnlichkeitsabgleich gefunden',
  [VALIDATION_ERROR_CODE.POTENTIAL_DUPLICATE]: 'Mögliches Duplikat erkannt',
});

export class ValidationError {
  #code;
  #message;
  #field;
  #severity;
  #details;

  constructor({ code, message = null, field = null, severity = VALIDATION_ERROR_SEVERITY.ERROR, details = null }) {
    if (!Object.values(VALIDATION_ERROR_CODE).includes(code)) {
      throw new Error(`Invalid validation error code: ${code}`);
    }

    this.#code = code;
    this.#message = message || VALIDATION_ERROR_MESSAGES[code];
    this.#field = field;
    this.#severity = severity;
    this.#details = details;
  }

  get code() {
    return this.#code;
  }

  get message() {
    return this.#message;
  }

  get field() {
    return this.#field;
  }

  get severity() {
    return this.#severity;
  }

  get details() {
    return this.#details;
  }

  get isError() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.ERROR;
  }

  get isWarning() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.WARNING;
  }

  get isInfo() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.INFO;
  }

  get fullMessage() {
    let msg = this.#message;
    if (this.#field) {
      msg = `${this.#field}: ${msg}`;
    }
    if (this.#details) {
      msg = `${msg} (${this.#details})`;
    }
    return msg;
  }

  equals(other) {
    if (!(other instanceof ValidationError)) {
      return false;
    }
    return (
      this.#code === other.code &&
      this.#field === other.field &&
      this.#severity === other.severity
    );
  }

  toJSON() {
    return {
      code: this.#code,
      message: this.#message,
      field: this.#field,
      severity: this.#severity,
      details: this.#details,
    };
  }

  static fromJSON(json) {
    return new ValidationError({
      code: json.code,
      message: json.message,
      field: json.field,
      severity: json.severity,
      details: json.details,
    });
  }

  static missingRequiredField(field) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.MISSING_REQUIRED_FIELD,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
    });
  }

  static invalidDateFormat(field, details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.INVALID_DATE_FORMAT,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details,
    });
  }

  static invalidNumberFormat(field, details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.INVALID_NUMBER_FORMAT,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details,
    });
  }

  static unknownAgent(agentName) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.UNKNOWN_AGENT,
      field: 'AP-VM',
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details: agentName,
    });
  }

  static unknownCategory(category) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.UNKNOWN_CATEGORY,
      field: 'Sparte',
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details: category,
    });
  }

  static duplicateEntry(details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.DUPLICATE_ENTRY,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
      details,
    });
  }

  static negativeAmount(field, amount) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.NEGATIVE_AMOUNT,
      field,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
      details: `${amount}`,
    });
  }

  static futureDate(field) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.FUTURE_DATE,
      field,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
    });
  }
}
