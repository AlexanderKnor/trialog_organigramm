/**
 * Repository Implementation: LocalRevenueRepository
 * Implements IRevenueRepository using localStorage
 */

import { IRevenueRepository } from '../../domain/repositories/IRevenueRepository.js';
import { RevenueEntry } from '../../domain/entities/RevenueEntry.js';

export class LocalRevenueRepository extends IRevenueRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  async findByEmployeeId(employeeId) {
    const data = await this.#dataSource.findByEmployeeId(employeeId);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async findById(entryId) {
    const data = await this.#dataSource.findById(entryId);
    return data ? RevenueEntry.fromJSON(data) : null;
  }

  async findAll() {
    const data = await this.#dataSource.findAll();
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async save(entry) {
    const data = entry.toJSON();
    await this.#dataSource.save(data);
    return entry;
  }

  async update(entry) {
    const data = entry.toJSON();
    await this.#dataSource.update(data);
    return entry;
  }

  async delete(entryId) {
    await this.#dataSource.delete(entryId);
  }

  async search(query) {
    const data = await this.#dataSource.search(query);
    return data.map((item) => RevenueEntry.fromJSON(item));
  }

  async batchUpdateStatus(updates) {
    for (const { entryId, status } of updates) {
      const data = await this.#dataSource.findById(entryId);
      if (data) {
        data.status = status;
        data.updatedAt = new Date().toISOString();
        await this.#dataSource.update(data);
      }
    }
  }

  async getNextCustomerNumber(employeeId) {
    const maxNumber = await this.#dataSource.getMaxCustomerNumber(employeeId);
    return maxNumber + 1;
  }
}
