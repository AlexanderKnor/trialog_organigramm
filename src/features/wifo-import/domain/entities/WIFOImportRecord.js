/**
 * Entity: WIFOImportRecord
 * Represents a single record from a WIFO import file
 * Contains raw data and validation state
 */

import { generateUUID } from '../../../../core/utils/index.js';
import {
  RecordValidationStatus,
  RECORD_VALIDATION_STATUS,
} from '../value-objects/RecordValidationStatus.js';
import { WIFOProvisionType } from '../value-objects/WIFOProvisionType.js';
import { WIFOCategory } from '../value-objects/WIFOCategory.js';

export class WIFOImportRecord {
  #id;
  #rowNumber;
  #rawData;

  // Parsed WIFO fields
  #datum;
  #vertrag;
  #sparte;
  #kundeNachname;
  #kundeVorname;
  #kundeGeburtsdatum;
  #firma;
  #vermittlerName;
  #art;
  #gesellschaft;
  #tarif;
  #basis;
  #satz;
  #brutto;
  #stornoreserve;
  #rb;
  #netto;
  #vertragId;
  #lauf;
  #erstelldatum;

  // Validation state
  #validationStatus;
  #validationErrors;

  // Mapping state
  #mappedEmployeeId;
  #mappedEmployeeName;
  #mappedCategoryType;
  #mappedProvisionType;

  constructor({
    id = null,
    rowNumber,
    rawData,
    datum = null,
    vertrag = null,
    sparte = null,
    kundeNachname = null,
    kundeVorname = null,
    kundeGeburtsdatum = null,
    firma = null,
    vermittlerName = null,
    art = null,
    gesellschaft = null,
    tarif = null,
    basis = null,
    satz = null,
    brutto = null,
    stornoreserve = null,
    rb = null,
    netto = null,
    vertragId = null,
    lauf = null,
    erstelldatum = null,
    validationStatus = RECORD_VALIDATION_STATUS.PENDING,
    validationErrors = [],
    mappedEmployeeId = null,
    mappedEmployeeName = null,
    mappedCategoryType = null,
    mappedProvisionType = null,
  }) {
    this.#id = id || generateUUID();
    this.#rowNumber = rowNumber;
    this.#rawData = rawData;

    // WIFO fields
    this.#datum = datum;
    this.#vertrag = vertrag;
    this.#sparte = sparte;
    this.#kundeNachname = kundeNachname;
    this.#kundeVorname = kundeVorname;
    this.#kundeGeburtsdatum = kundeGeburtsdatum;
    this.#firma = firma;
    this.#vermittlerName = vermittlerName;
    this.#art = art;
    this.#gesellschaft = gesellschaft;
    this.#tarif = tarif;
    this.#basis = basis;
    this.#satz = satz;
    this.#brutto = brutto;
    this.#stornoreserve = stornoreserve;
    this.#rb = rb;
    this.#netto = netto;
    this.#vertragId = vertragId;
    this.#lauf = lauf;
    this.#erstelldatum = erstelldatum;

    // Validation
    this.#validationStatus =
      validationStatus instanceof RecordValidationStatus
        ? validationStatus
        : new RecordValidationStatus(validationStatus);
    this.#validationErrors = validationErrors;

    // Mapping
    this.#mappedEmployeeId = mappedEmployeeId;
    this.#mappedEmployeeName = mappedEmployeeName;
    this.#mappedCategoryType = mappedCategoryType;
    this.#mappedProvisionType = mappedProvisionType;
  }

  // Identity
  get id() {
    return this.#id;
  }

  get rowNumber() {
    return this.#rowNumber;
  }

  get rawData() {
    return { ...this.#rawData };
  }

  // WIFO fields
  get datum() {
    return this.#datum;
  }

  get vertrag() {
    return this.#vertrag;
  }

  get sparte() {
    return this.#sparte;
  }

  get kundeNachname() {
    return this.#kundeNachname;
  }

  get kundeVorname() {
    return this.#kundeVorname;
  }

  get kundeName() {
    const parts = [this.#kundeVorname, this.#kundeNachname].filter(Boolean);
    return parts.join(' ') || null;
  }

  get kundeGeburtsdatum() {
    return this.#kundeGeburtsdatum;
  }

  get firma() {
    return this.#firma;
  }

  get vermittlerName() {
    return this.#vermittlerName;
  }

  get art() {
    return this.#art;
  }

  get gesellschaft() {
    return this.#gesellschaft;
  }

  get tarif() {
    return this.#tarif;
  }

  get basis() {
    return this.#basis;
  }

  get satz() {
    return this.#satz;
  }

  get brutto() {
    return this.#brutto;
  }

  get stornoreserve() {
    return this.#stornoreserve;
  }

  get rb() {
    return this.#rb;
  }

  get netto() {
    return this.#netto;
  }

  get vertragId() {
    return this.#vertragId;
  }

  get lauf() {
    return this.#lauf;
  }

  get erstelldatum() {
    return this.#erstelldatum;
  }

  // Validation
  get validationStatus() {
    return this.#validationStatus;
  }

  get validationErrors() {
    return [...this.#validationErrors];
  }

  get hasErrors() {
    return this.#validationErrors.some((e) => e.isError);
  }

  get hasWarnings() {
    return this.#validationErrors.some((e) => e.isWarning);
  }

  get canImport() {
    return this.#validationStatus.canImport;
  }

  // Mapping
  get mappedEmployeeId() {
    return this.#mappedEmployeeId;
  }

  get mappedEmployeeName() {
    return this.#mappedEmployeeName;
  }

  get mappedCategoryType() {
    return this.#mappedCategoryType;
  }

  get mappedProvisionType() {
    return this.#mappedProvisionType;
  }

  get isMapped() {
    return this.#mappedEmployeeId !== null && this.#mappedCategoryType !== null;
  }

  // Business methods
  setValidationResult(status, errors = []) {
    this.#validationStatus =
      status instanceof RecordValidationStatus
        ? status
        : new RecordValidationStatus(status);
    this.#validationErrors = errors;
  }

  addValidationError(error) {
    this.#validationErrors.push(error);
  }

  setMapping({ employeeId, employeeName, categoryType, provisionType }) {
    this.#mappedEmployeeId = employeeId;
    this.#mappedEmployeeName = employeeName;
    this.#mappedCategoryType = categoryType;
    this.#mappedProvisionType = provisionType;
  }

  markAsImported() {
    this.#validationStatus = RecordValidationStatus.imported();
  }

  markAsFailed() {
    this.#validationStatus = RecordValidationStatus.failed();
  }

  markAsSkipped() {
    this.#validationStatus = RecordValidationStatus.skipped();
  }

  toJSON() {
    return {
      id: this.#id,
      rowNumber: this.#rowNumber,
      rawData: this.#rawData,
      datum: this.#datum?.toISOString?.() ?? this.#datum,
      vertrag: this.#vertrag,
      sparte: this.#sparte,
      kundeNachname: this.#kundeNachname,
      kundeVorname: this.#kundeVorname,
      kundeGeburtsdatum: this.#kundeGeburtsdatum?.toISOString?.() ?? this.#kundeGeburtsdatum,
      firma: this.#firma,
      vermittlerName: this.#vermittlerName,
      art: this.#art,
      gesellschaft: this.#gesellschaft,
      tarif: this.#tarif,
      basis: this.#basis,
      satz: this.#satz,
      brutto: this.#brutto,
      stornoreserve: this.#stornoreserve,
      rb: this.#rb,
      netto: this.#netto,
      vertragId: this.#vertragId,
      lauf: this.#lauf,
      erstelldatum: this.#erstelldatum?.toISOString?.() ?? this.#erstelldatum,
      validationStatus: this.#validationStatus.toJSON(),
      validationErrors: this.#validationErrors.map((e) => e.toJSON()),
      mappedEmployeeId: this.#mappedEmployeeId,
      mappedEmployeeName: this.#mappedEmployeeName,
      mappedCategoryType: this.#mappedCategoryType,
      mappedProvisionType: this.#mappedProvisionType,
    };
  }

  static fromJSON(json) {
    const { ValidationError } = require('../value-objects/ValidationError.js');

    return new WIFOImportRecord({
      id: json.id,
      rowNumber: json.rowNumber,
      rawData: json.rawData,
      datum: json.datum ? new Date(json.datum) : null,
      vertrag: json.vertrag,
      sparte: json.sparte,
      kundeNachname: json.kundeNachname,
      kundeVorname: json.kundeVorname,
      kundeGeburtsdatum: json.kundeGeburtsdatum ? new Date(json.kundeGeburtsdatum) : null,
      firma: json.firma,
      vermittlerName: json.vermittlerName,
      art: json.art,
      gesellschaft: json.gesellschaft,
      tarif: json.tarif,
      basis: json.basis,
      satz: json.satz,
      brutto: json.brutto,
      stornoreserve: json.stornoreserve,
      rb: json.rb,
      netto: json.netto,
      vertragId: json.vertragId,
      lauf: json.lauf,
      erstelldatum: json.erstelldatum ? new Date(json.erstelldatum) : null,
      validationStatus: json.validationStatus,
      validationErrors: json.validationErrors?.map((e) => ValidationError.fromJSON(e)) || [],
      mappedEmployeeId: json.mappedEmployeeId,
      mappedEmployeeName: json.mappedEmployeeName,
      mappedCategoryType: json.mappedCategoryType,
      mappedProvisionType: json.mappedProvisionType,
    });
  }

  /**
   * Factory: Create from raw WIFO Excel row
   */
  static fromWIFORow(rowNumber, rowData, columnMap) {
    const getValue = (key) => {
      const index = columnMap[key];
      return index !== undefined ? rowData[index] : null;
    };

    // Parse Excel serial dates
    const parseExcelDate = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') {
        // Excel serial date: days since 1899-12-30
        const utcDays = Math.floor(value - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        return date;
      }
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    };

    return new WIFOImportRecord({
      rowNumber,
      rawData: [...rowData],
      datum: parseExcelDate(getValue('Datum')),
      vertrag: getValue('Vertrag')?.toString() ?? null,
      sparte: getValue('Sparte'),
      kundeNachname: getValue('Kunde Name'),
      kundeVorname: getValue('Kunde Vorname'),
      kundeGeburtsdatum: parseExcelDate(getValue('Kunde Geburtsdatum')),
      firma: getValue('Firma'),
      vermittlerName: getValue('AP-VM'),
      art: getValue('Art'),
      gesellschaft: getValue('Gesellschaft'),
      tarif: getValue('Tarif'),
      basis: parseFloat(getValue('Basis')) || null,
      satz: getValue('Satz'),
      brutto: parseFloat(getValue('Brutto')) || null,
      stornoreserve: parseFloat(getValue('Stornoreserve')) || null,
      rb: parseFloat(getValue('RB')) || null,
      netto: parseFloat(getValue('Netto')) || null,
      vertragId: getValue('Vertrag ID')?.toString() ?? null,
      lauf: getValue('Lauf')?.toString() ?? null,
      erstelldatum: parseExcelDate(getValue('Erstelldatum')),
    });
  }
}
