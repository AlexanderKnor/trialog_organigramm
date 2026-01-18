/**
 * Domain Service: WIFOValidationService
 * Validates WIFO import records against business rules
 */

import {
  RecordValidationStatus,
  RECORD_VALIDATION_STATUS,
} from '../value-objects/RecordValidationStatus.js';
import {
  ValidationError,
  VALIDATION_ERROR_CODE,
  VALIDATION_ERROR_SEVERITY,
} from '../value-objects/ValidationError.js';
import { WIFOCategory } from '../value-objects/WIFOCategory.js';
import { WIFOProvisionType } from '../value-objects/WIFOProvisionType.js';
import { FuzzyMatcher } from './FuzzyMatcher.js';
import { DuplicateDetectionService } from './DuplicateDetectionService.js';

export class WIFOValidationService {
  #hierarchyService;
  #employees;
  #employeeNameMap;
  #fuzzyMatchThreshold;
  #duplicateService;
  #duplicateCheckEnabled;

  constructor(hierarchyService, options = {}) {
    this.#hierarchyService = hierarchyService;
    this.#employees = [];
    this.#employeeNameMap = new Map();
    this.#fuzzyMatchThreshold = options.fuzzyMatchThreshold || 0.75;
    this.#duplicateService = new DuplicateDetectionService();
    this.#duplicateCheckEnabled = options.duplicateCheckEnabled !== false;
  }

  /**
   * Build duplicate detection index from existing entries
   * @param {RevenueEntry[]} existingEntries - Existing revenue entries
   */
  buildDuplicateIndex(existingEntries) {
    this.#duplicateService.buildIndex(existingEntries);
  }

  /**
   * Build employee name lookup map from hierarchy
   * @param {Employee[]} employees - List of all employees
   */
  buildEmployeeLookup(employees) {
    this.#employees = employees;
    this.#employeeNameMap.clear();

    for (const employee of employees) {
      // Create lookup keys from various name formats
      const fullName = employee.name?.toLowerCase().trim();
      if (fullName) {
        this.#employeeNameMap.set(fullName, employee);
      }

      // Also try "LastName, FirstName" format (as in WIFO)
      if (employee.lastName && employee.firstName) {
        const wifoFormat = `${employee.lastName}, ${employee.firstName}`.toLowerCase().trim();
        this.#employeeNameMap.set(wifoFormat, employee);
      }

      // Also try "FirstName LastName" format
      if (employee.firstName && employee.lastName) {
        const normalFormat = `${employee.firstName} ${employee.lastName}`.toLowerCase().trim();
        this.#employeeNameMap.set(normalFormat, employee);
      }
    }
  }

  /**
   * Validate a single WIFO record
   * @param {WIFOImportRecord} record - The record to validate
   * @returns {Object} Validation result with status and errors
   */
  validateRecord(record) {
    const errors = [];

    // Required field validations
    this.#validateRequiredFields(record, errors);

    // Data format validations
    this.#validateDataFormats(record, errors);

    // Business rule validations
    this.#validateBusinessRules(record, errors);

    // Agent mapping validation
    const agentMapping = this.#validateAndMapAgent(record, errors);

    // Category mapping validation
    const categoryMapping = this.#validateAndMapCategory(record, errors);

    // Provision type mapping
    const provisionType = this.#validateAndMapProvisionType(record, errors);

    // Duplicate detection (needs employeeId mapping first)
    let duplicateInfo = null;
    if (this.#duplicateCheckEnabled && agentMapping?.id) {
      // Create a proxy object with the actual values from the record's getters
      const tempRecord = {
        vertrag: record.vertrag,
        vertragId: record.vertragId,
        datum: record.datum,
        netto: record.netto,
        kundeName: record.kundeName,
        kundeVorname: record.kundeVorname,
        mappedEmployeeId: agentMapping.id,
      };
      duplicateInfo = this.#checkDuplicate(tempRecord, errors);
    }

    // Determine final status
    let status;
    const hasErrors = errors.some((e) => e.isError);
    const hasWarnings = errors.some((e) => e.isWarning);

    if (hasErrors) {
      status = RecordValidationStatus.invalid();
    } else if (hasWarnings) {
      status = RecordValidationStatus.warning();
    } else {
      status = RecordValidationStatus.valid();
    }

    return {
      status,
      errors,
      mapping: {
        employeeId: agentMapping?.id ?? null,
        employeeName: agentMapping?.name ?? null,
        categoryType: categoryMapping,
        provisionType,
      },
      duplicateInfo,
    };
  }

  /**
   * Check for duplicate entries
   * @param {Object} record - Record with mappedEmployeeId
   * @param {ValidationError[]} errors - Errors array to append to
   * @returns {Object|null} - Duplicate info or null
   */
  #checkDuplicate(record, errors) {
    const result = this.#duplicateService.checkDuplicate(record);

    if (result.isDuplicate) {
      errors.push(
        new ValidationError({
          code: VALIDATION_ERROR_CODE.DUPLICATE_ENTRY,
          message: `Eintrag bereits vorhanden (${result.duplicateType === 'exact_contract' ? 'exakte Übereinstimmung' : result.duplicateType === 'contract_match' ? 'Vertragsnummer' : 'Datum & Betrag'})`,
          severity: VALIDATION_ERROR_SEVERITY.ERROR,
          details: {
            duplicateType: result.duplicateType,
            existingEntry: result.existingEntry,
            confidence: result.confidence,
          },
        })
      );
    } else if (result.duplicateType === 'potential_duplicate' && result.confidence > 0.5) {
      errors.push(
        new ValidationError({
          code: VALIDATION_ERROR_CODE.POTENTIAL_DUPLICATE,
          message: `Mögliches Duplikat: Gleicher Betrag am gleichen Tag`,
          severity: VALIDATION_ERROR_SEVERITY.WARNING,
          details: {
            duplicateType: result.duplicateType,
            existingEntry: result.existingEntry,
            confidence: result.confidence,
          },
        })
      );
    }

    return result;
  }

  /**
   * Validate all records in a batch
   * @param {WIFOImportBatch} batch - The batch to validate
   * @param {Function} onProgress - Progress callback (current, total)
   * @returns {Promise<WIFOImportBatch>}
   */
  async validateBatch(batch, onProgress = null) {
    batch.startValidating();

    const records = batch.records;
    const total = records.length;

    // First pass: Check for internal duplicates within the batch
    const internalDuplicates = this.#duplicateService.findInternalDuplicates(records);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const result = this.validateRecord(record);

      // Check if this record is an internal duplicate
      this.#checkInternalDuplicate(record, i, internalDuplicates, result.errors);

      record.setValidationResult(result.status, result.errors);

      if (result.mapping.employeeId) {
        record.setMapping(result.mapping);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Yield to prevent blocking
      if (i % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    batch.finishValidation();
    return batch;
  }

  /**
   * Check if a record is an internal duplicate within the batch
   * @param {WIFOImportRecord} record - The record to check
   * @param {number} index - Record index in batch
   * @param {Map} duplicateGroups - Map of duplicate groups
   * @param {ValidationError[]} errors - Errors array to append to
   */
  #checkInternalDuplicate(record, index, duplicateGroups, errors) {
    for (const [key, indices] of duplicateGroups) {
      if (indices.includes(index)) {
        // This is part of a duplicate group
        const isFirstOccurrence = indices[0] === index;

        if (!isFirstOccurrence) {
          errors.push(
            new ValidationError({
              code: VALIDATION_ERROR_CODE.DUPLICATE_ENTRY,
              message: `Duplikat in dieser Datei (Zeile ${indices[0] + 2})`,
              severity: VALIDATION_ERROR_SEVERITY.WARNING,
              details: {
                duplicateType: 'internal',
                firstOccurrenceIndex: indices[0],
                allIndices: indices,
              },
            })
          );
        }
        break;
      }
    }
  }

  #validateRequiredFields(record, errors) {
    // Netto (provision) is required
    if (record.netto === null || record.netto === undefined) {
      errors.push(ValidationError.missingRequiredField('Netto'));
    }

    // Vermittler (agent) is required
    if (!record.vermittlerName) {
      errors.push(ValidationError.missingRequiredField('AP-VM'));
    }

    // Sparte (category) is required
    if (!record.sparte) {
      errors.push(ValidationError.missingRequiredField('Sparte'));
    }

    // Datum is required
    if (!record.datum) {
      errors.push(ValidationError.missingRequiredField('Datum'));
    }
  }

  #validateDataFormats(record, errors) {
    // Date validation
    if (record.datum && !(record.datum instanceof Date) && isNaN(record.datum.getTime?.())) {
      errors.push(ValidationError.invalidDateFormat('Datum', record.rawData[0]));
    }

    // Number format validations
    if (record.netto !== null && typeof record.netto !== 'number') {
      errors.push(ValidationError.invalidNumberFormat('Netto', record.rawData[20]));
    }

    if (record.brutto !== null && typeof record.brutto !== 'number') {
      errors.push(ValidationError.invalidNumberFormat('Brutto', record.rawData[17]));
    }
  }

  #validateBusinessRules(record, errors) {
    // Future date warning
    if (record.datum instanceof Date) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (record.datum > today) {
        errors.push(ValidationError.futureDate('Datum'));
      }
    }

    // Negative amount warning
    if (typeof record.netto === 'number' && record.netto < 0) {
      errors.push(ValidationError.negativeAmount('Netto', record.netto));
    }

    // Amount consistency check (Brutto - Stornoreserve - RB should approximately equal Netto)
    if (
      typeof record.brutto === 'number' &&
      typeof record.stornoreserve === 'number' &&
      typeof record.rb === 'number' &&
      typeof record.netto === 'number'
    ) {
      const calculated = record.brutto - record.stornoreserve - record.rb;
      const tolerance = 0.01; // 1 cent tolerance
      if (Math.abs(calculated - record.netto) > tolerance) {
        errors.push(
          new ValidationError({
            code: VALIDATION_ERROR_CODE.AMOUNT_MISMATCH,
            message: `Netto stimmt nicht überein (erwartet: ${calculated.toFixed(2)}, ist: ${record.netto.toFixed(2)})`,
            severity: VALIDATION_ERROR_SEVERITY.INFO,
          })
        );
      }
    }
  }

  #validateAndMapAgent(record, errors) {
    if (!record.vermittlerName) {
      return null;
    }

    // Try exact match first (fast path)
    const searchKey = record.vermittlerName.toLowerCase().trim();
    const exactEmployee = this.#employeeNameMap.get(searchKey);

    if (exactEmployee) {
      return {
        id: exactEmployee.id,
        name: exactEmployee.name,
        matchScore: 1.0,
        matchType: 'exact',
      };
    }

    // Fall back to fuzzy matching
    const fuzzyResult = FuzzyMatcher.findBestMatch(
      record.vermittlerName,
      this.#employees,
      this.#fuzzyMatchThreshold
    );

    if (fuzzyResult.employee) {
      // Add warning if not exact match
      if (!fuzzyResult.isExact) {
        errors.push(
          new ValidationError({
            code: VALIDATION_ERROR_CODE.FUZZY_MATCH,
            field: 'AP-VM',
            message: `Mitarbeiter "${fuzzyResult.employee.name}" gefunden (${Math.round(fuzzyResult.score * 100)}% Übereinstimmung)`,
            severity: VALIDATION_ERROR_SEVERITY.WARNING,
            details: {
              searchedName: record.vermittlerName,
              matchedName: fuzzyResult.employee.name,
              score: fuzzyResult.score,
              matchType: fuzzyResult.matchType,
            },
          })
        );
      }

      return {
        id: fuzzyResult.employee.id,
        name: fuzzyResult.employee.name,
        matchScore: fuzzyResult.score,
        matchType: fuzzyResult.matchType,
      };
    }

    // No match found - try to provide suggestions
    const suggestions = FuzzyMatcher.findAllMatches(record.vermittlerName, this.#employees, 0.5);
    const suggestionText =
      suggestions.length > 0
        ? ` Mögliche Übereinstimmungen: ${suggestions
            .slice(0, 3)
            .map((s) => s.employee.name)
            .join(', ')}`
        : '';

    errors.push(
      new ValidationError({
        code: VALIDATION_ERROR_CODE.UNKNOWN_AGENT,
        field: 'AP-VM',
        message: `Mitarbeiter "${record.vermittlerName}" nicht gefunden.${suggestionText}`,
        severity: VALIDATION_ERROR_SEVERITY.ERROR,
        details: {
          searchedName: record.vermittlerName,
          suggestions: suggestions.slice(0, 3).map((s) => ({
            name: s.employee.name,
            score: s.score,
          })),
        },
      })
    );

    return null;
  }

  #validateAndMapCategory(record, errors) {
    if (!record.sparte) {
      return null;
    }

    const category = WIFOCategory.tryParse(record.sparte);
    if (!category) {
      errors.push(ValidationError.unknownCategory(record.sparte));
      return null;
    }

    return category.internalCategoryType;
  }

  #validateAndMapProvisionType(record, errors) {
    if (!record.art) {
      return null;
    }

    const provisionType = WIFOProvisionType.tryParse(record.art);
    if (!provisionType) {
      errors.push(
        new ValidationError({
          code: VALIDATION_ERROR_CODE.INVALID_PROVISION_TYPE,
          field: 'Art',
          severity: VALIDATION_ERROR_SEVERITY.WARNING,
          details: record.art,
        })
      );
      return null;
    }

    return provisionType.value;
  }

  /**
   * Find employee by name using various matching strategies
   * @param {string} name - Name to search for
   * @returns {Employee|null}
   */
  findEmployeeByName(name) {
    if (!name) return null;
    return this.#employeeNameMap.get(name.toLowerCase().trim()) ?? null;
  }
}
