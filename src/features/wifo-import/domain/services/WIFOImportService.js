/**
 * Domain Service: WIFOImportService
 * Orchestrates the WIFO import process
 */

import { WIFOImportBatch } from '../entities/WIFOImportBatch.js';
import { WIFOValidationService } from './WIFOValidationService.js';
import { WIFO_IMPORT_STATUS } from '../value-objects/WIFOImportStatus.js';
import { RECORD_VALIDATION_STATUS } from '../value-objects/RecordValidationStatus.js';
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
    // Build employee lookup for validation
    const employees = await this.#hierarchyService.getAllEmployees();
    this.#validationService.buildEmployeeLookup(employees);
    Logger.log(`✓ Built employee lookup with ${employees.length} employees`);

    // Build duplicate detection index from existing revenue entries
    try {
      const existingEntries = await this.#loadExistingEntriesForDuplicateCheck();
      Logger.log(`✓ Loaded ${existingEntries.length} existing entries for duplicate detection`);

      // Debug: Log first few entries to verify data
      if (existingEntries.length > 0) {
        const sample = existingEntries.slice(0, 3);
        Logger.log('   Sample entries:', sample.map(e => ({
          id: e.id,
          contractNumber: e.contractNumber,
          employeeId: e.employeeId,
          source: e.source,
          sourceReference: e.sourceReference,
        })));
      }

      this.#validationService.buildDuplicateIndex(existingEntries);
    } catch (error) {
      console.warn('Could not load existing entries for duplicate detection:', error.message);
    }
  }

  /**
   * Load existing revenue entries for duplicate detection
   * @returns {Promise<RevenueEntry[]>}
   */
  async #loadExistingEntriesForDuplicateCheck() {
    // Try to get entries from repository if available
    if (this.#revenueService && typeof this.#revenueService.searchEntries === 'function') {
      try {
        // Load all entries (no filter - we need all for duplicate detection)
        const entries = await this.#revenueService.searchEntries({});
        Logger.log(`   searchEntries returned ${entries?.length || 0} entries`);
        return entries || [];
      } catch (error) {
        // Fallback: try to get all entries
        Logger.warn('Search failed, falling back to findAll:', error.message);
      }
    }

    // If repository has findAll, use it
    if (this.#wifoRepository && typeof this.#wifoRepository.getAllImportedEntries === 'function') {
      return await this.#wifoRepository.getAllImportedEntries() || [];
    }

    return [];
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
   * Import validated records as revenue entries
   * @param {WIFOImportBatch} batch - The batch to import
   * @param {Object} options - Import options
   * @param {number} options.batchSize - Number of records to process per chunk (default: 10)
   * @param {number} options.concurrency - Number of parallel imports (default: 3)
   * @param {boolean} options.stopOnError - Stop import on first error (default: false)
   * @param {number} options.retryCount - Number of retries for failed imports (default: 1)
   * @param {number} options.retryDelay - Delay between retries in ms (default: 500)
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<WIFOImportBatch>}
   */
  async importBatch(batch, options = {}, onProgress = null) {
    if (!batch.canImport) {
      throw new Error('Batch cannot be imported: no valid records');
    }

    const {
      batchSize = 10,
      concurrency = 3,
      stopOnError = false,
      retryCount = 1,
      retryDelay = 500,
    } = options;

    batch.startImporting();

    const importableRecords = batch.getImportableRecords();
    const total = importableRecords.length;
    let imported = 0;
    let failed = 0;
    let shouldStop = false;

    // Process in chunks for better memory management
    const chunks = this.#chunkArray(importableRecords, batchSize);

    for (let chunkIndex = 0; chunkIndex < chunks.length && !shouldStop; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // Process chunk with controlled concurrency
      const results = await this.#processChunkWithConcurrency(
        chunk,
        concurrency,
        async (record) => {
          return await this.#importRecordWithRetry(record, options, retryCount, retryDelay);
        }
      );

      // Update counts and records based on results
      for (let i = 0; i < results.length; i++) {
        const { success, error } = results[i];
        const record = chunk[i];

        if (success) {
          record.markAsImported();
          imported++;
        } else {
          record.markAsFailed();
          record.addValidationError({
            code: 'IMPORT_ERROR',
            message: error?.message || 'Unbekannter Fehler',
            severity: 'error',
          });
          failed++;

          if (stopOnError) {
            shouldStop = true;
            break;
          }
        }
      }

      // Report progress after each chunk
      const processed = Math.min((chunkIndex + 1) * batchSize, total);
      if (onProgress) {
        onProgress(processed, total, {
          imported,
          failed,
          remaining: total - processed,
          chunkProgress: {
            current: chunkIndex + 1,
            total: chunks.length,
          },
        });
      }

      // Yield to prevent blocking between chunks
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    batch.finishImport();

    // Update repository
    if (this.#wifoRepository) {
      await this.#wifoRepository.save(batch);
    }

    return batch;
  }

  /**
   * Process a chunk of records with controlled concurrency
   * @param {Array} chunk - Records to process
   * @param {number} concurrency - Max parallel operations
   * @param {Function} processor - Async function to process each record
   * @returns {Promise<Array<{success: boolean, error?: Error}>>}
   */
  async #processChunkWithConcurrency(chunk, concurrency, processor) {
    const results = [];
    const executing = new Set();

    for (let i = 0; i < chunk.length; i++) {
      const record = chunk[i];

      const promise = processor(record)
        .then(() => ({ success: true }))
        .catch((error) => ({ success: false, error }))
        .finally(() => executing.delete(promise));

      results.push(promise);
      executing.add(promise);

      // If we've hit concurrency limit, wait for one to finish
      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }

    // Wait for all remaining operations
    return Promise.all(results);
  }

  /**
   * Import a record with retry logic
   * @param {WIFOImportRecord} record - The record to import
   * @param {Object} options - Import options
   * @param {number} retryCount - Number of retries
   * @param {number} retryDelay - Delay between retries
   */
  async #importRecordWithRetry(record, options, retryCount, retryDelay) {
    let lastError = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        await this.#importRecord(record, options);
        Logger.log(`✓ Import successful: ${record.vermittlerName} - ${record.vertrag}`);
        return; // Success
      } catch (error) {
        lastError = error;
        Logger.error(`❌ Import attempt ${attempt + 1} failed for ${record.vermittlerName}:`, error.message);
        Logger.error('   Stack:', error.stack);

        if (attempt < retryCount) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Split array into chunks
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array<Array>}
   */
  #chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Import a single record as a revenue entry
   * @param {WIFOImportRecord} record - The record to import
   * @param {Object} options - Import options
   */
  async #importRecord(record, options = {}) {
    Logger.log('📥 Importing WIFO record:', {
      vermittler: record.vermittlerName,
      vertrag: record.vertrag,
      netto: record.netto,
      mappedEmployeeId: record.mappedEmployeeId,
      mappedCategoryType: record.mappedCategoryType,
    });

    if (!record.mappedEmployeeId) {
      throw new Error('Record has no mapped employee');
    }

    if (!record.mappedCategoryType) {
      throw new Error('Record has no mapped category');
    }

    const employeeId = record.mappedEmployeeId;

    // Build revenue entry data matching RevenueEntry constructor
    const entryData = {
      category: record.mappedCategoryType,
      provisionType: this.#mapProvisionType(record.mappedCategoryType),
      customerName: this.#buildCustomerName(record),
      provisionAmount: record.netto || 0,
      contractNumber: record.vertrag || '',
      notes: this.#buildDescription(record),
      entryDate: record.datum || new Date(),
      // Product mapping (use gesellschaft as provider name)
      product: {
        name: record.tarif || 'WIFO Import',
        category: record.mappedCategoryType,
      },
      productProvider: {
        name: record.gesellschaft || 'WIFO',
        category: record.mappedCategoryType,
      },
      // Source tracking for duplicate detection
      source: 'wifo_import',
      sourceReference: record.vertrag,
      // Preserve original WIFO data as metadata in notes
      wifoMetadata: {
        sparte: record.sparte,
        art: record.art,
        basis: record.basis,
        satz: record.satz,
        brutto: record.brutto,
        stornoreserve: record.stornoreserve,
        rb: record.rb,
        lauf: record.lauf,
        importedAt: new Date().toISOString(),
      },
    };

    // Create revenue entry using existing service (employeeId is first parameter)
    Logger.log('   📤 Calling revenueService.addEntry with employeeId:', employeeId);
    await this.#revenueService.addEntry(employeeId, entryData);
    Logger.log('   ✓ Entry created successfully');
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
   * Map WIFO category to internal provision type
   * @param {string} categoryType - Internal category type
   * @returns {string}
   */
  #mapProvisionType(categoryType) {
    // WIFO data is always insurance
    return 'insurance';
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
