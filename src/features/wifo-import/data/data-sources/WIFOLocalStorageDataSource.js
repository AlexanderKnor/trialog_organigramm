/**
 * Data Source: WIFOLocalStorageDataSource
 * Stores WIFO import batches in LocalStorage
 * Useful for offline/demo scenarios
 */

import { WIFOImportBatch } from '../../domain/entities/WIFOImportBatch.js';

const STORAGE_KEY = 'wifo_import_batches';
const MAX_STORED_BATCHES = 20;

export class WIFOLocalStorageDataSource {
  #storage;

  constructor() {
    this.#storage = typeof localStorage !== 'undefined' ? localStorage : null;
  }

  /**
   * Save a batch to storage
   * @param {WIFOImportBatch} batch - The batch to save
   * @returns {Promise<void>}
   */
  async save(batch) {
    const batches = this.#loadBatches();

    // Find existing or add new
    const index = batches.findIndex((b) => b.id === batch.id);
    if (index >= 0) {
      batches[index] = batch.toJSON();
    } else {
      batches.unshift(batch.toJSON());
    }

    // Limit stored batches
    if (batches.length > MAX_STORED_BATCHES) {
      batches.splice(MAX_STORED_BATCHES);
    }

    this.#saveBatches(batches);
  }

  /**
   * Find a batch by ID
   * @param {string} id - The batch ID
   * @returns {Promise<WIFOImportBatch|null>}
   */
  async findById(id) {
    const batches = this.#loadBatches();
    const batchData = batches.find((b) => b.id === id);

    if (!batchData) {
      return null;
    }

    return WIFOImportBatch.fromJSON(batchData);
  }

  /**
   * Find batches by user ID
   * @param {string} userId - The user ID
   * @param {Object} options - Query options
   * @returns {Promise<WIFOImportBatch[]>}
   */
  async findByUserId(userId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    const batches = this.#loadBatches();

    const filtered = batches.filter((b) => b.uploadedBy === userId);
    const sliced = filtered.slice(offset, offset + limit);

    return sliced.map((b) => WIFOImportBatch.fromJSON(b));
  }

  /**
   * Find recent batches
   * @param {number} limit - Maximum number of batches
   * @returns {Promise<WIFOImportBatch[]>}
   */
  async findRecent(limit = 10) {
    const batches = this.#loadBatches();
    const sorted = batches.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
    const sliced = sorted.slice(0, limit);

    return sliced.map((b) => WIFOImportBatch.fromJSON(b));
  }

  /**
   * Delete a batch by ID
   * @param {string} id - The batch ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    const batches = this.#loadBatches();
    const filtered = batches.filter((b) => b.id !== id);
    this.#saveBatches(filtered);
  }

  /**
   * Update batch status
   * @param {string} id - The batch ID
   * @param {string} status - The new status
   * @returns {Promise<void>}
   */
  async updateStatus(id, status) {
    const batches = this.#loadBatches();
    const batch = batches.find((b) => b.id === id);

    if (batch) {
      batch.status = status;
      this.#saveBatches(batches);
    }
  }

  /**
   * Update batch statistics
   * @param {string} id - The batch ID
   * @param {Object} statistics - Updated statistics
   * @returns {Promise<void>}
   */
  async updateStatistics(id, statistics) {
    const batches = this.#loadBatches();
    const batch = batches.find((b) => b.id === id);

    if (batch) {
      Object.assign(batch, statistics);
      this.#saveBatches(batches);
    }
  }

  /**
   * Clear all batches
   * @returns {Promise<void>}
   */
  async clear() {
    this.#saveBatches([]);
  }

  #loadBatches() {
    if (!this.#storage) {
      return [];
    }

    try {
      const json = this.#storage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  #saveBatches(batches) {
    if (!this.#storage) {
      return;
    }

    try {
      this.#storage.setItem(STORAGE_KEY, JSON.stringify(batches));
    } catch (error) {
      console.warn('Failed to save WIFO batches to localStorage:', error);
    }
  }
}
