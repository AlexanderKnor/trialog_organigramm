/**
 * Repository: LocalStorageWIFORepository
 * Implements IWIFOImportRepository using LocalStorage
 */

import { IWIFOImportRepository } from '../../domain/repositories/IWIFOImportRepository.js';
import { WIFOLocalStorageDataSource } from '../data-sources/WIFOLocalStorageDataSource.js';

export class LocalStorageWIFORepository extends IWIFOImportRepository {
  #dataSource;

  constructor(dataSource = null) {
    super();
    this.#dataSource = dataSource || new WIFOLocalStorageDataSource();
  }

  async save(batch) {
    await this.#dataSource.save(batch);
    return batch;
  }

  async findById(id) {
    return this.#dataSource.findById(id);
  }

  async findByUserId(userId, options = {}) {
    return this.#dataSource.findByUserId(userId, options);
  }

  async findRecent(limit = 10) {
    return this.#dataSource.findRecent(limit);
  }

  async delete(id) {
    return this.#dataSource.delete(id);
  }

  async updateStatus(id, status) {
    return this.#dataSource.updateStatus(id, status);
  }

  async updateStatistics(id, statistics) {
    return this.#dataSource.updateStatistics(id, statistics);
  }
}
