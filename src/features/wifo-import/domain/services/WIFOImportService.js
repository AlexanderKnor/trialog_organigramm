/**
 * Domain Service: WIFOImportService
 * Orchestrates the WIFO import process
 */

import { WIFOImportBatch } from '../entities/WIFOImportBatch.js';
import { WIFOValidationService } from './WIFOValidationService.js';
import { REVENUE_STATUS_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueStatus.js';
import { Logger } from '../../../../core/utils/logger.js';

export class WIFOImportService {
  #revenueService;
  #hierarchyService;
  #wifoRepository;
  #validationService;
  #fileParser;

  constructor({
    revenueService,
    hierarchyService,
    wifoRepository,
    fileParser,
  }) {
    this.#revenueService = revenueService;
    this.#hierarchyService = hierarchyService;
    this.#wifoRepository = wifoRepository;
    this.#fileParser = fileParser;
    this.#validationService = new WIFOValidationService(hierarchyService);
  }

  /**
   * Initialize the service with employee data for validation and duplicate detection
   * @returns {Promise<void>}
   */
  async initialize() {
    const employees = await this.#hierarchyService.getAllEmployees();
    this.#validationService.buildEmployeeLookup(employees);

    // The duplicate index needs every existing entry; without it validation
    // still works but cannot flag re-imports.
    try {
      const existingEntries = (await this.#revenueService.searchEntries({})) || [];
      this.#validationService.buildDuplicateIndex(existingEntries);
    } catch (error) {
      Logger.warn('Could not load existing entries for duplicate detection:', error.message);
    }
  }

  /**
   * Parse a WIFO file and create an import batch
   * @param {File} file - The uploaded file
   * @param {string} userId - The user performing the import
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportBatch>}
   */
  async parseFile(file, userId, onProgress = null) {
    // Create batch
    const batch = WIFOImportBatch.create({
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: userId,
    });

    batch.startParsing();

    try {
      // Parse file using injected parser
      const records = await this.#fileParser.parse(file, onProgress);

      batch.setRecords(records);

      // Save batch to repository
      if (this.#wifoRepository) {
        await this.#wifoRepository.save(batch);
      }

      return batch;
    } catch (error) {
      batch.fail(`Fehler beim Lesen der Datei: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate all records in a batch
   * @param {WIFOImportBatch} batch - The batch to validate
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportBatch>}
   */
  async validateBatch(batch, onProgress = null) {
    // Ensure employee lookup is built
    await this.initialize();

    // Run validation
    await this.#validationService.validateBatch(batch, onProgress);

    // Update repository
    if (this.#wifoRepository) {
      await this.#wifoRepository.save(batch);
    }

    return batch;
  }

  /**
   * Import validated records as revenue entries.
   *
   * All entries are written through the bulk path: customer numbers are
   * assigned race-free per employee and persistence is all-or-nothing — if
   * the write fails, already-committed entries are removed again and the
   * batch is marked failed. Every created entry carries the batch id as
   * importBatchId, so a completed import can still be rolled back later.
   *
   * @param {WIFOImportBatch} batch - The batch to import
   * @param {Object} options - Import options
   * @param {string[]} options.selectedIds - Restrict the import to these record ids
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportBatch>}
   */
  async importBatch(batch, options = {}, onProgress = null) {
    if (!batch.canImport) {
      throw new Error('Batch cannot be imported: no valid records');
    }

    const selectedIds = options.selectedIds ? new Set(options.selectedIds) : null;
    const records = batch
      .getImportableRecords()
      .filter((record) => !selectedIds || selectedIds.has(record.id));

    if (records.length === 0) {
      throw new Error('Keine Einträge zum Importieren ausgewählt');
    }

    batch.startImporting();
    const total = records.length;

    if (onProgress) {
      onProgress(0, total, { imported: 0, failed: 0, remaining: total });
    }

    // Rows that cannot be turned into a valid entry are rejected here,
    // before anything touches the database.
    const items = [];
    for (const record of records) {
      try {
        items.push({
          record,
          employeeId: record.mappedEmployeeId,
          entryData: this.#buildEntryData(record, batch.id),
        });
      } catch (error) {
        record.markAsFailed();
        record.addValidationError({
          code: 'IMPORT_ERROR',
          message: error?.message || 'Unbekannter Fehler',
          severity: 'error',
        });
      }
    }

    let result;
    try {
      result = await this.#revenueService.addEntriesBulk(
        items.map(({ employeeId, entryData }) => ({ employeeId, entryData }))
      );
    } catch (error) {
      // saveMany guarantees no partial data survives a failed write.
      batch.fail(`Import fehlgeschlagen, keine Einträge gespeichert: ${error.message}`);
      if (this.#wifoRepository) {
        await this.#wifoRepository.save(batch);
      }
      throw error;
    }

    for (const { index } of result.created) {
      items[index].record.markAsImported();
    }

    for (const { index, error } of result.failures) {
      const record = items[index].record;
      record.markAsFailed();
      record.addValidationError({
        code: 'IMPORT_ERROR',
        message: error?.message || 'Unbekannter Fehler',
        severity: 'error',
      });
    }

    if (onProgress) {
      onProgress(total, total, {
        imported: result.created.length,
        failed: total - result.created.length,
        remaining: 0,
      });
    }

    batch.finishImport();

    if (this.#wifoRepository) {
      await this.#wifoRepository.save(batch);
    }

    return batch;
  }

  /**
   * Delete every revenue entry a batch created (identified by importBatchId).
   * @param {WIFOImportBatch|null} batch - Batch to mark as rolled back (optional)
   * @param {string} importBatchId - The import batch id stamped on the entries
   * @returns {Promise<number>} number of deleted entries
   */
  async rollbackImport(batch, importBatchId) {
    const deletedCount = await this.#revenueService.rollbackImportBatch(importBatchId);

    if (batch) {
      batch.markRolledBack();
      if (this.#wifoRepository) {
        await this.#wifoRepository.save(batch);
      }
    }

    Logger.log(`✓ WIFO import ${importBatchId} rolled back (${deletedCount} entries)`);
    return deletedCount;
  }

  /**
   * Build the revenue entry payload for a validated WIFO record.
   * @param {WIFOImportRecord} record - The record to convert
   * @param {string} importBatchId - Batch id stamped on the entry
   */
  #buildEntryData(record, importBatchId) {
    if (!record.mappedEmployeeId) {
      throw new Error('Record has no mapped employee');
    }

    if (!record.mappedCategoryType) {
      throw new Error('Record has no mapped category');
    }

    // Negative Netto rows (Storno/Rueckforderung) are imported as regular
    // provisioned entries with a negative amount so they NET AGAINST the
    // totals. Importing them as CANCELLED would exclude them from every sum
    // and silently overstate revenue and payouts.
    const nettoValue = record.netto || 0;

    return {
      category: record.mappedCategoryType,
      provisionType: 'insurance',
      customerName: this.#buildCustomerName(record),
      provisionAmount: nettoValue,
      contractNumber: record.vertrag || '',
      notes: this.#buildDescription(record),
      entryDate: record.datum || new Date(),
      status: REVENUE_STATUS_TYPES.PROVISIONED,
      product: {
        name: record.tarif || 'WIFO Import',
        category: record.mappedCategoryType,
      },
      productProvider: {
        name: record.gesellschaft || 'WIFO',
        category: record.mappedCategoryType,
      },
      // Identity in the database: source marks the origin, sourceReference is
      // the row fingerprint used for duplicate detection, importBatchId groups
      // the run for auditing and rollback.
      source: 'wifo_import',
      sourceReference: record.fingerprint,
      importBatchId,
      importMetadata: {
        lauf: record.lauf,
        vertragId: record.vertragId,
        sparte: record.sparte,
        art: record.art,
        basis: record.basis,
        satz: record.satz,
        brutto: record.brutto,
        stornoreserve: record.stornoreserve,
        rb: record.rb,
      },
    };
  }

  /**
   * Build customer name from WIFO record
   * @param {WIFOImportRecord} record - The record
   * @returns {string}
   */
  #buildCustomerName(record) {
    if (record.kundeName) {
      return record.kundeName;
    }

    if (record.kundeVorname) {
      return record.kundeVorname;
    }

    return 'Unbekannt (WIFO Import)';
  }

  /**
   * Build a description from WIFO record data
   * @param {WIFOImportRecord} record - The record
   * @returns {string}
   */
  #buildDescription(record) {
    const parts = [];

    if (record.gesellschaft) {
      parts.push(record.gesellschaft);
    }

    if (record.tarif) {
      parts.push(record.tarif);
    }

    if (record.art) {
      parts.push(`(${record.art})`);
    }

    if (record.vertrag) {
      parts.push(`- Vertrag: ${record.vertrag}`);
    }

    return parts.join(' ') || 'WIFO Import';
  }

  /**
   * Get import statistics for a batch
   * @param {WIFOImportBatch} batch - The batch
   * @returns {Object}
   */
  getStatistics(batch) {
    return {
      total: batch.totalRecords,
      valid: batch.validRecords,
      invalid: batch.invalidRecords,
      warnings: batch.warningRecords,
      imported: batch.importedRecords,
      failed: batch.failedRecords,
      skipped: batch.skippedRecords,
      importable: batch.importableRecords,
      validationProgress: batch.validationProgress,
      importProgress: batch.importProgress,
    };
  }

  /**
   * Get recent import batches
   * @param {number} limit - Maximum number of batches
   * @returns {Promise<WIFOImportBatch[]>}
   */
  async getRecentBatches(limit = 10) {
    if (!this.#wifoRepository) {
      return [];
    }
    return this.#wifoRepository.findRecent(limit);
  }

  /**
   * Get a specific batch by ID
   * @param {string} batchId - The batch ID
   * @returns {Promise<WIFOImportBatch|null>}
   */
  async getBatchById(batchId) {
    if (!this.#wifoRepository) {
      return null;
    }
    return this.#wifoRepository.findById(batchId);
  }

  /**
   * Skip specific records in a batch
   * @param {WIFOImportBatch} batch - The batch
   * @param {string[]} recordIds - IDs of records to skip
   * @returns {WIFOImportBatch}
   */
  skipRecords(batch, recordIds) {
    const recordIdSet = new Set(recordIds);

    for (const record of batch.records) {
      if (recordIdSet.has(record.id)) {
        record.markAsSkipped();
      }
    }

    return batch;
  }

  /**
   * Re-validate a specific record with updated mapping
   * @param {WIFOImportRecord} record - The record to re-validate
   * @param {Object} mapping - New mapping to apply
   * @returns {Object}
   */
  revalidateRecordWithMapping(record, mapping) {
    record.setMapping(mapping);
    return this.#validationService.validateRecord(record);
  }
}
