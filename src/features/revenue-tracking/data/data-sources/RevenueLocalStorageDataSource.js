/**
 * Data Source: RevenueLocalStorageDataSource
 * Handles persistence of revenue entries to localStorage
 */

import { StorageError } from '../../../../core/errors/index.js';

const STORAGE_KEY = 'trialog_revenue_entries';

export class RevenueLocalStorageDataSource {
  #getStorageKey() {
    return STORAGE_KEY;
  }

  async findByEmployeeId(employeeId) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) return [];

      const entries = JSON.parse(data);
      return entries.filter((entry) => entry.employeeId === employeeId);
    } catch (error) {
      throw new StorageError(`Failed to load revenue entries: ${error.message}`);
    }
  }

  async findById(entryId) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) return null;

      const entries = JSON.parse(data);
      return entries.find((entry) => entry.id === entryId) || null;
    } catch (error) {
      throw new StorageError(`Failed to load revenue entry: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) return [];

      return JSON.parse(data);
    } catch (error) {
      throw new StorageError(`Failed to load all revenue entries: ${error.message}`);
    }
  }

  async save(entryData) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      const entries = data ? JSON.parse(data) : [];

      entries.push(entryData);
      localStorage.setItem(this.#getStorageKey(), JSON.stringify(entries));

      return entryData;
    } catch (error) {
      throw new StorageError(`Failed to save revenue entry: ${error.message}`);
    }
  }

  async update(entryData) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) {
        throw new StorageError('No entries found');
      }

      const entries = JSON.parse(data);
      const index = entries.findIndex((e) => e.id === entryData.id);

      if (index === -1) {
        throw new StorageError(`Entry with id '${entryData.id}' not found`);
      }

      entries[index] = entryData;
      localStorage.setItem(this.#getStorageKey(), JSON.stringify(entries));

      return entryData;
    } catch (error) {
      throw new StorageError(`Failed to update revenue entry: ${error.message}`);
    }
  }

  async delete(entryId) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) return;

      const entries = JSON.parse(data);
      const filteredEntries = entries.filter((e) => e.id !== entryId);
      localStorage.setItem(this.#getStorageKey(), JSON.stringify(filteredEntries));
    } catch (error) {
      throw new StorageError(`Failed to delete revenue entry: ${error.message}`);
    }
  }

  async search(query) {
    try {
      const data = localStorage.getItem(this.#getStorageKey());
      if (!data) return [];

      const entries = JSON.parse(data);
      const lowerQuery = query.toLowerCase();

      return entries.filter(
        (entry) =>
          entry.customerName.toLowerCase().includes(lowerQuery) ||
          entry.contractNumber.toLowerCase().includes(lowerQuery),
      );
    } catch (error) {
      throw new StorageError(`Failed to search revenue entries: ${error.message}`);
    }
  }

  async getMaxCustomerNumber(employeeId) {
    try {
      const entries = await this.findByEmployeeId(employeeId);
      if (entries.length === 0) return 0;

      return Math.max(...entries.map((e) => e.customerNumber));
    } catch (error) {
      throw new StorageError(`Failed to get max customer number: ${error.message}`);
    }
  }

  async clear() {
    try {
      localStorage.removeItem(this.#getStorageKey());
    } catch (error) {
      throw new StorageError(`Failed to clear revenue entries: ${error.message}`);
    }
  }
}
