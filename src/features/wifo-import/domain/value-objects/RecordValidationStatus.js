/**
 * Value Object: RecordValidationStatus
 * Represents the validation status of a single WIFO import record
 */

export const RECORD_VALIDATION_STATUS = Object.freeze({
  PENDING: 'pending',
  VALID: 'valid',
  WARNING: 'warning',
  INVALID: 'invalid',
  SKIPPED: 'skipped',
  IMPORTED: 'imported',
  FAILED: 'failed',
});

export const RECORD_VALIDATION_STATUS_DISPLAY = Object.freeze({
  [RECORD_VALIDATION_STATUS.PENDING]: 'Ausstehend',
  [RECORD_VALIDATION_STATUS.VALID]: 'Gültig',
  [RECORD_VALIDATION_STATUS.WARNING]: 'Warnung',
  [RECORD_VALIDATION_STATUS.INVALID]: 'Ungültig',
  [RECORD_VALIDATION_STATUS.SKIPPED]: 'Übersprungen',
  [RECORD_VALIDATION_STATUS.IMPORTED]: 'Importiert',
  [RECORD_VALIDATION_STATUS.FAILED]: 'Fehlgeschlagen',
});

export class RecordValidationStatus {
  #status;

  constructor(status) {
    if (!Object.values(RECORD_VALIDATION_STATUS).includes(status)) {
      throw new Error(`Invalid record validation status: ${status}`);
    }
    this.#status = status;
  }

  get value() {
    return this.#status;
  }

  get displayName() {
    return RECORD_VALIDATION_STATUS_DISPLAY[this.#status];
  }

  get isPending() {
    return this.#status === RECORD_VALIDATION_STATUS.PENDING;
  }

  get isValid() {
    return this.#status === RECORD_VALIDATION_STATUS.VALID;
  }

  get hasWarning() {
    return this.#status === RECORD_VALIDATION_STATUS.WARNING;
  }

  get isInvalid() {
    return this.#status === RECORD_VALIDATION_STATUS.INVALID;
  }

  get isSkipped() {
    return this.#status === RECORD_VALIDATION_STATUS.SKIPPED;
  }

  get isImported() {
    return this.#status === RECORD_VALIDATION_STATUS.IMPORTED;
  }

  get isFailed() {
    return this.#status === RECORD_VALIDATION_STATUS.FAILED;
  }

  get canImport() {
    return [
      RECORD_VALIDATION_STATUS.VALID,
      RECORD_VALIDATION_STATUS.WARNING,
    ].includes(this.#status);
  }

  equals(other) {
    if (!(other instanceof RecordValidationStatus)) {
      return false;
    }
    return this.#status === other.value;
  }

  toJSON() {
    return this.#status;
  }

  static fromJSON(json) {
    return new RecordValidationStatus(json);
  }

  static pending() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.PENDING);
  }

  static valid() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.VALID);
  }

  static warning() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.WARNING);
  }

  static invalid() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.INVALID);
  }

  static skipped() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.SKIPPED);
  }

  static imported() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.IMPORTED);
  }

  static failed() {
    return new RecordValidationStatus(RECORD_VALIDATION_STATUS.FAILED);
  }
}
