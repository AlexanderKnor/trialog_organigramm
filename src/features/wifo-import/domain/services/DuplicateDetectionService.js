/**
 * Domain Service: DuplicateDetectionService
 * Detects duplicate entries during WIFO import.
 *
 * A contract number alone is NOT a duplicate signal: Bestandsprovisionen
 * recur monthly for the same contract, so every follow-up settlement run
 * legitimately repeats the contract numbers of the previous one. Duplicates
 * are therefore detected via the row fingerprint (which includes the WIFO
 * Lauf) and via contract + date + amount coincidence.
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

    for (const entry of entries) {
      if (entry.contractNumber) {
        this.#addToIndex(
          this.#createContractKey(entry.contractNumber, entry.employeeId),
          entry
        );
      }

      const json = entry.toJSON ? entry.toJSON() : entry;
      if (json.sourceReference) {
        this.#addToIndex(this.#createSourceKey(json.sourceReference), entry);
      }

      this.#addToIndex(
        this.#createAmountKey(
          entry.entryDate || entry.createdAt,
          entry.provisionAmount,
          entry.employeeId
        ),
        entry
      );
    }

    Logger.log(`✓ Built duplicate index over ${entries.length} entries (${this.#entryIndex.size} keys)`);
  }

  #addToIndex(key, entry) {
    if (!this.#entryIndex.has(key)) {
      this.#entryIndex.set(key, []);
    }
    this.#entryIndex.get(key).push(entry);
  }

  /**
   * Check if a WIFO record is a potential duplicate
   * @param {Object} record - Record fields incl. fingerprint, art and mappedEmployeeId
   * @returns {{isDuplicate: boolean, duplicateType: string|null, existingEntry: Object|null, confidence: number}}
   */
  checkDuplicate(record) {
    if (!record.mappedEmployeeId) {
      return { isDuplicate: false, duplicateType: null, existingEntry: null, confidence: 0 };
    }

    // Check 1: Row fingerprint — the same WIFO row was imported before
    // (re-uploaded file or overlapping export). Not scoped to the employee,
    // so a corrected agent mapping cannot hide a re-import.
    if (record.fingerprint) {
      const sourceMatches = this.#entryIndex.get(this.#createSourceKey(record.fingerprint));
      if (sourceMatches && sourceMatches.length > 0) {
        return {
          isDuplicate: true,
          duplicateType: 'exact_import',
          existingEntry: this.#entryToSummary(sourceMatches[0]),
          confidence: 1.0,
        };
      }
    }

    const vertragId = record.vertrag || record.vertragId;

    // Check 2: Same date + amount for the employee. Together with a matching
    // contract number this is a near-certain duplicate; with only a similar
    // customer name it is still treated as one.
    if (record.datum && record.netto !== null) {
      const amountKey = this.#createAmountKey(record.datum, record.netto, record.mappedEmployeeId);
      const amountMatches = this.#entryIndex.get(amountKey) || [];

      for (const match of amountMatches) {
        const sameContract =
          vertragId &&
          match.contractNumber &&
          this.#normalize(match.contractNumber) === this.#normalize(vertragId);

        if (sameContract) {
          return {
            isDuplicate: true,
            duplicateType: 'contract_date_amount',
            existingEntry: this.#entryToSummary(match),
            confidence: 0.98,
          };
        }

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

      if (amountMatches.length > 0) {
        // Date + amount match but different customer - still flag as potential
        return {
          isDuplicate: false,
          duplicateType: 'potential_duplicate',
          existingEntry: this.#entryToSummary(amountMatches[0]),
          confidence: 0.6,
        };
      }
    }

    // Check 3: Abschlussprovision for a contract that already has an entry.
    // AP is a one-time commission, so a repeated contract is suspicious there
    // — unlike recurring Bestandsprovisionen, which repeat by design.
    const isInitialCommission = (record.art || '').toUpperCase().startsWith('AP');
    if (isInitialCommission && vertragId) {
      const contractMatches = this.#entryIndex.get(
        this.#createContractKey(vertragId, record.mappedEmployeeId)
      );
      if (contractMatches && contractMatches.length > 0) {
        return {
          isDuplicate: false,
          duplicateType: 'repeated_initial_commission',
          existingEntry: this.#entryToSummary(contractMatches[0]),
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
   * Create source reference lookup key (row fingerprint, employee-independent)
   * @param {string} sourceRef - Source reference (WIFO row fingerprint)
   * @returns {string}
   */
  #createSourceKey(sourceRef) {
    return `source:${this.#normalize(sourceRef)}`;
  }

  #normalize(value) {
    return (value ?? '').toString().toLowerCase().trim();
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
