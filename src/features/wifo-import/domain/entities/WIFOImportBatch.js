/**
 * Entity: WIFOImportBatch (Aggregate Root)
 * Represents a batch of WIFO records being imported
 * Manages the overall import state and collection of records
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { WIFOImportStatus, WIFO_IMPORT_STATUS } from '../value-objects/WIFOImportStatus.js';
import { RECORD_VALIDATION_STATUS } from '../value-objects/RecordValidationStatus.js';

export class WIFOImportBatch {
  #id;
  #fileName;
  #fileSize;
  #uploadedAt;
  #uploadedBy;
  #status;
  #records;
  #totalRecords;
  #validRecords;
  #invalidRecords;
  #warningRecords;
  #importedRecords;
  #failedRecords;
  #skippedRecords;
  #startedAt;
  #completedAt;
  #errorMessage;

  constructor({
    id = null,
    fileName,
    fileSize = 0,
    uploadedAt = new Date(),
    uploadedBy = null,
    status = WIFO_IMPORT_STATUS.PENDING,
    records = [],
    totalRecords = 0,
    validRecords = 0,
    invalidRecords = 0,
    warningRecords = 0,
    importedRecords = 0,
    failedRecords = 0,
    skippedRecords = 0,
    startedAt = null,
    completedAt = null,
    errorMessage = null,
  }) {
    this.#id = id || generateUUID();
    this.#fileName = fileName;
    this.#fileSize = fileSize;
    this.#uploadedAt = uploadedAt instanceof Date ? uploadedAt : new Date(uploadedAt);
    this.#uploadedBy = uploadedBy;
    this.#status =
      status instanceof WIFOImportStatus ? status : new WIFOImportStatus(status);
    this.#records = records;
    this.#totalRecords = totalRecords || records.length;
    this.#validRecords = validRecords;
    this.#invalidRecords = invalidRecords;
    this.#warningRecords = warningRecords;
    this.#importedRecords = importedRecords;
    this.#failedRecords = failedRecords;
    this.#skippedRecords = skippedRecords;
    this.#startedAt = startedAt ? new Date(startedAt) : null;
    this.#completedAt = completedAt ? new Date(completedAt) : null;
    this.#errorMessage = errorMessage;
  }

  // Identity
  get id() {
    return this.#id;
  }

  // Metadata
  get fileName() {
    return this.#fileName;
  }

  get fileSize() {
    return this.#fileSize;
  }

  get fileSizeFormatted() {
    const kb = this.#fileSize / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  get uploadedAt() {
    return this.#uploadedAt;
  }

  get uploadedBy() {
    return this.#uploadedBy;
  }

  // Status
  get status() {
    return this.#status;
  }

  get statusValue() {
    return this.#status.value;
  }

  get statusDisplayName() {
    return this.#status.displayName;
  }

  get isProcessing() {
    return this.#status.isProcessing;
  }

  get canImport() {
    return this.#status.canImport && this.#validRecords > 0;
  }

  // Records
  get records() {
    return [...this.#records];
  }

  get recordCount() {
    return this.#records.length;
  }

  // Statistics
  get totalRecords() {
    return this.#totalRecords;
  }

  get validRecords() {
    return this.#validRecords;
  }

  get invalidRecords() {
    return this.#invalidRecords;
  }

  get warningRecords() {
    return this.#warningRecords;
  }

  get importedRecords() {
    return this.#importedRecords;
  }

  get failedRecords() {
    return this.#failedRecords;
  }

  get skippedRecords() {
    return this.#skippedRecords;
  }

  get importableRecords() {
    return this.#validRecords + this.#warningRecords;
  }

  get validationProgress() {
    if (this.#totalRecords === 0) return 0;
    return Math.round(
      ((this.#validRecords + this.#invalidRecords + this.#warningRecords) /
        this.#totalRecords) *
        100
    );
  }

  get importProgress() {
    const total = this.importableRecords;
    if (total === 0) return 0;
    return Math.round(
      ((this.#importedRecords + this.#failedRecords + this.#skippedRecords) / total) * 100
    );
  }

  // Timestamps
  get startedAt() {
    return this.#startedAt;
  }

  get completedAt() {
    return this.#completedAt;
  }

  get errorMessage() {
    return this.#errorMessage;
  }

  // Business methods
  setRecords(records) {
    this.#records = records;
    this.#totalRecords = records.length;
    this.#recalculateStatistics();
  }

  addRecord(record) {
    this.#records.push(record);
    this.#totalRecords = this.#records.length;
    this.#updateStatisticsForRecord(record);
  }

  getRecordById(id) {
    return this.#records.find((r) => r.id === id);
  }

  getRecordByRowNumber(rowNumber) {
    return this.#records.find((r) => r.rowNumber === rowNumber);
  }

  getImportableRecords() {
    return this.#records.filter((r) => r.canImport);
  }

  getInvalidRecords() {
    return this.#records.filter((r) => r.validationStatus.isInvalid);
  }

  getRecordsWithWarnings() {
    return this.#records.filter((r) => r.validationStatus.hasWarning);
  }

  // Status transitions
  startParsing() {
    this.#status = WIFOImportStatus.parsing();
    this.#startedAt = new Date();
  }

  startValidating() {
    this.#status = WIFOImportStatus.validating();
  }

  finishValidation() {
    this.#recalculateStatistics();

    if (this.#invalidRecords === this.#totalRecords) {
      this.#status = WIFOImportStatus.failed();
      this.#errorMessage = 'Alle Einträge sind ungültig';
    } else if (this.importableRecords > 0) {
      this.#status = WIFOImportStatus.ready();
    } else {
      this.#status = WIFOImportStatus.failed();
      this.#errorMessage = 'Keine importierbaren Einträge';
    }
  }

  startImporting() {
    this.#status = WIFOImportStatus.importing();
  }

  finishImport() {
    this.#recalculateStatistics();

    if (this.#failedRecords > 0 && this.#importedRecords > 0) {
      this.#status = WIFOImportStatus.partiallyCompleted();
    } else if (this.#importedRecords > 0) {
      this.#status = WIFOImportStatus.completed();
    } else {
      this.#status = WIFOImportStatus.failed();
      this.#errorMessage = 'Kein Eintrag konnte importiert werden';
    }

    this.#completedAt = new Date();
  }

  fail(errorMessage) {
    this.#status = WIFOImportStatus.failed();
    this.#errorMessage = errorMessage;
    this.#completedAt = new Date();
  }

  #recalculateStatistics() {
    let valid = 0;
    let invalid = 0;
    let warning = 0;
    let imported = 0;
    let failed = 0;
    let skipped = 0;

    for (const record of this.#records) {
      const status = record.validationStatus.value;
      switch (status) {
        case RECORD_VALIDATION_STATUS.VALID:
          valid++;
          break;
        case RECORD_VALIDATION_STATUS.INVALID:
          invalid++;
          break;
        case RECORD_VALIDATION_STATUS.WARNING:
          warning++;
          break;
        case RECORD_VALIDATION_STATUS.IMPORTED:
          imported++;
          break;
        case RECORD_VALIDATION_STATUS.FAILED:
          failed++;
          break;
        case RECORD_VALIDATION_STATUS.SKIPPED:
          skipped++;
          break;
      }
    }

    this.#validRecords = valid;
    this.#invalidRecords = invalid;
    this.#warningRecords = warning;
    this.#importedRecords = imported;
    this.#failedRecords = failed;
    this.#skippedRecords = skipped;
  }

  #updateStatisticsForRecord(record) {
    const status = record.validationStatus.value;
    switch (status) {
      case RECORD_VALIDATION_STATUS.VALID:
        this.#validRecords++;
        break;
      case RECORD_VALIDATION_STATUS.INVALID:
        this.#invalidRecords++;
        break;
      case RECORD_VALIDATION_STATUS.WARNING:
        this.#warningRecords++;
        break;
      case RECORD_VALIDATION_STATUS.IMPORTED:
        this.#importedRecords++;
        break;
      case RECORD_VALIDATION_STATUS.FAILED:
        this.#failedRecords++;
        break;
      case RECORD_VALIDATION_STATUS.SKIPPED:
        this.#skippedRecords++;
        break;
    }
  }

  toJSON() {
    return {
      id: this.#id,
      fileName: this.#fileName,
      fileSize: this.#fileSize,
      uploadedAt: this.#uploadedAt.toISOString(),
      uploadedBy: this.#uploadedBy,
      status: this.#status.toJSON(),
      records: this.#records.map((r) => r.toJSON()),
      totalRecords: this.#totalRecords,
      validRecords: this.#validRecords,
      invalidRecords: this.#invalidRecords,
      warningRecords: this.#warningRecords,
      importedRecords: this.#importedRecords,
      failedRecords: this.#failedRecords,
      skippedRecords: this.#skippedRecords,
      startedAt: this.#startedAt?.toISOString() ?? null,
      completedAt: this.#completedAt?.toISOString() ?? null,
      errorMessage: this.#errorMessage,
    };
  }

  static fromJSON(json) {
    const { WIFOImportRecord } = require('./WIFOImportRecord.js');

    return new WIFOImportBatch({
      id: json.id,
      fileName: json.fileName,
      fileSize: json.fileSize,
      uploadedAt: json.uploadedAt,
      uploadedBy: json.uploadedBy,
      status: json.status,
      records: json.records?.map((r) => WIFOImportRecord.fromJSON(r)) || [],
      totalRecords: json.totalRecords,
      validRecords: json.validRecords,
      invalidRecords: json.invalidRecords,
      warningRecords: json.warningRecords,
      importedRecords: json.importedRecords,
      failedRecords: json.failedRecords,
      skippedRecords: json.skippedRecords,
      startedAt: json.startedAt,
      completedAt: json.completedAt,
      errorMessage: json.errorMessage,
    });
  }

  static create({ fileName, fileSize, uploadedBy }) {
    return new WIFOImportBatch({
      fileName,
      fileSize,
      uploadedBy,
    });
  }
}
