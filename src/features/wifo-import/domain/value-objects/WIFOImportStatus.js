/**
 * Value Object: WIFOImportStatus
 * Represents the status of a WIFO import batch
 */

export const WIFO_IMPORT_STATUS = Object.freeze({
  PENDING: 'pending',
  PARSING: 'parsing',
  VALIDATING: 'validating',
  READY: 'ready',
  IMPORTING: 'importing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIALLY_COMPLETED: 'partiallyCompleted',
});

export const WIFO_IMPORT_STATUS_DISPLAY = Object.freeze({
  [WIFO_IMPORT_STATUS.PENDING]: 'Ausstehend',
  [WIFO_IMPORT_STATUS.PARSING]: 'Wird gelesen...',
  [WIFO_IMPORT_STATUS.VALIDATING]: 'Wird validiert...',
  [WIFO_IMPORT_STATUS.READY]: 'Bereit zum Import',
  [WIFO_IMPORT_STATUS.IMPORTING]: 'Wird importiert...',
  [WIFO_IMPORT_STATUS.COMPLETED]: 'Abgeschlossen',
  [WIFO_IMPORT_STATUS.FAILED]: 'Fehlgeschlagen',
  [WIFO_IMPORT_STATUS.PARTIALLY_COMPLETED]: 'Teilweise importiert',
});

export class WIFOImportStatus {
  #status;

  constructor(status) {
    if (!Object.values(WIFO_IMPORT_STATUS).includes(status)) {
      throw new Error(`Invalid WIFO import status: ${status}`);
    }
    this.#status = status;
  }

  get value() {
    return this.#status;
  }

  get displayName() {
    return WIFO_IMPORT_STATUS_DISPLAY[this.#status];
  }

  get isPending() {
    return this.#status === WIFO_IMPORT_STATUS.PENDING;
  }

  get isProcessing() {
    return [
      WIFO_IMPORT_STATUS.PARSING,
      WIFO_IMPORT_STATUS.VALIDATING,
      WIFO_IMPORT_STATUS.IMPORTING,
    ].includes(this.#status);
  }

  get isReady() {
    return this.#status === WIFO_IMPORT_STATUS.READY;
  }

  get isCompleted() {
    return this.#status === WIFO_IMPORT_STATUS.COMPLETED;
  }

  get isFailed() {
    return this.#status === WIFO_IMPORT_STATUS.FAILED;
  }

  get isPartiallyCompleted() {
    return this.#status === WIFO_IMPORT_STATUS.PARTIALLY_COMPLETED;
  }

  get canImport() {
    return this.#status === WIFO_IMPORT_STATUS.READY;
  }

  equals(other) {
    if (!(other instanceof WIFOImportStatus)) {
      return false;
    }
    return this.#status === other.value;
  }

  toJSON() {
    return this.#status;
  }

  static fromJSON(json) {
    return new WIFOImportStatus(json);
  }

  static pending() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.PENDING);
  }

  static parsing() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.PARSING);
  }

  static validating() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.VALIDATING);
  }

  static ready() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.READY);
  }

  static importing() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.IMPORTING);
  }

  static completed() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.COMPLETED);
  }

  static failed() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.FAILED);
  }

  static partiallyCompleted() {
    return new WIFOImportStatus(WIFO_IMPORT_STATUS.PARTIALLY_COMPLETED);
  }
}
