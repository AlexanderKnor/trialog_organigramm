/**
 * Domain Service: DuplicateDetectionService
 * Detects duplicate entries during WIFO import
 */

import { Logger } from '../../../../core/utils/logger.js';

export class DuplicateDetectionService {
  #existingEntries;
  #entryIndex;

  constructor() {
    this.#existingEntries = [];
    this.#entryIndex = new Map();
  }

  /**
   * Build index from existing revenue entries for fast duplicate lookup
   * @param {RevenueEntry[]} entries - Existing entries to index
   */
  buildIndex(entries) {
    this.#existingEntries = entries;
    this.#entryIndex.clear();

    let contractKeys = 0;
    let sourceKeys = 0;
    let amountKeys = 0;

    for (const entry of entries) {
      // Primary key: contract number + employee
      if (entry.contractNumber) {
        const contractKey = this.#createContractKey(
          entry.contractNumber,
          entry.employeeId
        );
        if (!this.#entryIndex.has(contractKey)) {
          this.#entryIndex.set(contractKey, []);
        }
        this.#entryIndex.get(contractKey).push(entry);
        contractKeys++;
      }

      // Secondary key: source reference (for WIFO imported entries)
      const json = entry.toJSON ? entry.toJSON() : entry;
      if (json.sourceReference) {
        const sourceKey = this.#createSourceKey(json.sourceReference, entry.employeeId);
        if (!this.#entryIndex.has(sourceKey)) {
          this.#entryIndex.set(sourceKey, []);
        }
        this.#entryIndex.get(sourceKey).push(entry);
        sourceKeys++;
      }

      // Tertiary key: date + amount + employee (for fuzzy duplicate detection)
      const amountKey = this.#createAmountKey(
        entry.entryDate || entry.createdAt,
        entry.provisionAmount,
        entry.employeeId
      );
      if (!this.#entryIndex.has(amountKey)) {
        this.#entryIndex.set(amountKey, []);
      }
      this.#entryIndex.get(amountKey).push(entry);
      amountKeys++;
    }

    Logger.log(`✓ Built duplicate index: ${contractKeys} contract keys, ${sourceKeys} source keys, ${amountKeys} amount keys`);
    Logger.log(`   Total unique keys in index: ${this.#entryIndex.size}`);
  }

  /**
   * Check if a WIFO record is a potential duplicate
   * @param {WIFOImportRecord} record - The record to check
   * @returns {{isDuplicate: boolean, duplicateType: string|null, existingEntry: Object|null, confidence: number}}
   */
  #debugLogCount = 0;

  checkDuplicate(record) {
    if (!record.mappedEmployeeId) {
      return { isDuplicate: false, duplicateType: null, existingEntry: null, confidence: 0 };
    }

    const shouldLog = this.#debugLogCount < 3; // Only log first 3 records
    if (shouldLog) {
      this.#debugLogCount++;
      Logger.log(`🔍 Checking duplicate for record:`, {
        vertrag: record.vertrag,
        mappedEmployeeId: record.mappedEmployeeId,
        datum: record.datum,
        netto: record.netto,
      });
    }

    // Check 1: Exact contract/vertrag match (highest confidence)
    const vertragId = record.vertrag || record.vertragId;
    if (vertragId) {
      const sourceKey = this.#createSourceKey(vertragId, record.mappedEmployeeId);
      const sourceMatches = this.#entryIndex.get(sourceKey);

      if (shouldLog) {
        Logger.log(`   Source key: ${sourceKey}, matches: ${sourceMatches?.length || 0}`);
      }

      if (sourceMatches && sourceMatches.length > 0) {
        Logger.log(`   ✓ DUPLICATE FOUND (source match)`);
        return {
          isDuplicate: true,
          duplicateType: 'exact_contract',
          existingEntry: this.#entryToSummary(sourceMatches[0]),
          confidence: 1.0,
        };
      }
    }

    // Check 2: Contract number match
    if (vertragId) {
      const contractKey = this.#createContractKey(vertragId, record.mappedEmployeeId);
      const contractMatches = this.#entryIndex.get(contractKey);

      if (shouldLog) {
        Logger.log(`   Contract key: ${contractKey}, matches: ${contractMatches?.length || 0}`);
      }

      if (contractMatches && contractMatches.length > 0) {
        Logger.log(`   ✓ DUPLICATE FOUND (contract match)`);
        return {
          isDuplicate: true,
          duplicateType: 'contract_match',
          existingEntry: this.#entryToSummary(contractMatches[0]),
          confidence: 0.95,
        };
      }
    }

    // Check 3: Same date + amount + employee (potential duplicate)
    if (record.datum && record.netto !== null) {
      const amountKey = this.#createAmountKey(record.datum, record.netto, record.mappedEmployeeId);
      const amountMatches = this.#entryIndex.get(amountKey);

      if (amountMatches && amountMatches.length > 0) {
        // Further verification: check customer name similarity
        for (const match of amountMatches) {
          const nameSimilarity = this.#calculateNameSimilarity(
            record.kundeName || record.kundeVorname,
            match.customerName
          );

          if (nameSimilarity > 0.7) {
            return {
              isDuplicate: true,
              duplicateType: 'amount_date_match',
              existingEntry: this.#entryToSummary(match),
              confidence: 0.8 + nameSimilarity * 0.15, // Max 0.95
            };
          }
        }

        // Date + amount match but different customer - still flag as potential
        return {
          isDuplicate: false,
          duplicateType: 'potential_duplicate',
          existingEntry: this.#entryToSummary(amountMatches[0]),
          confidence: 0.6,
        };
      }
    }

    return { isDuplicate: false, duplicateType: null, existingEntry: null, confidence: 0 };
  }

  /**
   * Check duplicates within the batch itself (internal duplicates)
   * @param {WIFOImportRecord[]} records - All records in the batch
   * @returns {Map<string, number[]>} - Map of duplicate groups (key -> array of indices)
   */
  findInternalDuplicates(records) {
    const duplicateGroups = new Map();
    const seen = new Map();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Create unique key for the record
      const key = this.#createRecordKey(record);

      if (seen.has(key)) {
        // Found duplicate within batch
        const firstIndex = seen.get(key);
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, [firstIndex]);
        }
        duplicateGroups.get(key).push(i);
      } else {
        seen.set(key, i);
      }
    }

    return duplicateGroups;
  }

  /**
   * Create a unique key for a WIFO record
   * @param {WIFOImportRecord} record - The record
   * @returns {string}
   */
  #createRecordKey(record) {
    const parts = [
      record.vertrag || '',
      record.datum ? this.#formatDate(record.datum) : '',
      record.netto !== null ? record.netto.toFixed(2) : '',
      (record.vermittlerName || '').toLowerCase().trim(),
    ];
    return parts.join('|');
  }

  /**
   * Create contract lookup key
   * @param {string} contractNumber - Contract number
   * @param {string} employeeId - Employee ID
   * @returns {string}
   */
  #createContractKey(contractNumber, employeeId) {
    return `contract:${(contractNumber || '').toString().toLowerCase().trim()}:${employeeId}`;
  }

  /**
   * Create source reference lookup key
   * @param {string} sourceRef - Source reference (WIFO vertrag ID)
   * @param {string} employeeId - Employee ID
   * @returns {string}
   */
  #createSourceKey(sourceRef, employeeId) {
    return `source:${(sourceRef || '').toString().toLowerCase().trim()}:${employeeId}`;
  }

  /**
   * Create amount/date lookup key
   * @param {Date|string} date - Entry date
   * @param {number} amount - Provision amount
   * @param {string} employeeId - Employee ID
   * @returns {string}
   */
  #createAmountKey(date, amount, employeeId) {
    const dateStr = this.#formatDate(date);
    const amountStr = amount !== null ? Math.abs(amount).toFixed(2) : '0.00';
    return `amount:${dateStr}:${amountStr}:${employeeId}`;
  }

  /**
   * Format date for key creation
   * @param {Date|string} date - Date to format
   * @returns {string}
   */
  #formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Calculate name similarity (simple approach)
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} - Similarity score 0-1
   */
  #calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;

    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    if (n1 === n2) return 1;

    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;

    // Simple word overlap
    const words1 = new Set(n1.split(/\s+/));
    const words2 = new Set(n2.split(/\s+/));
    let overlap = 0;
    for (const word of words1) {
      if (words2.has(word)) overlap++;
    }

    const maxWords = Math.max(words1.size, words2.size);
    return maxWords > 0 ? overlap / maxWords : 0;
  }

  /**
   * Convert entry to summary for display
   * @param {RevenueEntry} entry - The entry
   * @returns {Object}
   */
  #entryToSummary(entry) {
    const json = entry.toJSON ? entry.toJSON() : entry;
    return {
      id: json.id,
      customerName: json.customerName,
      contractNumber: json.contractNumber,
      provisionAmount: json.provisionAmount,
      entryDate: json.entryDate,
      source: json.source,
      sourceReference: json.sourceReference,
    };
  }

  /**
   * Get statistics about the current index
   * @returns {Object}
   */
  getIndexStats() {
    return {
      totalEntries: this.#existingEntries.length,
      indexedKeys: this.#entryIndex.size,
    };
  }
}
