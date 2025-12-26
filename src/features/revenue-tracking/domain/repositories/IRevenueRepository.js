/**
 * Repository Interface: IRevenueRepository
 * Defines the contract for revenue data persistence
 */

export class IRevenueRepository {
  async findByEmployeeId(employeeId) {
    throw new Error('Method not implemented');
  }

  async findById(entryId) {
    throw new Error('Method not implemented');
  }

  async findAll() {
    throw new Error('Method not implemented');
  }

  async save(entry) {
    throw new Error('Method not implemented');
  }

  async update(entry) {
    throw new Error('Method not implemented');
  }

  async delete(entryId) {
    throw new Error('Method not implemented');
  }

  async search(query) {
    throw new Error('Method not implemented');
  }

  async findByTipProviderId(tipProviderId) {
    throw new Error('Method not implemented');
  }

  async getNextCustomerNumber(employeeId) {
    throw new Error('Method not implemented');
  }
}
