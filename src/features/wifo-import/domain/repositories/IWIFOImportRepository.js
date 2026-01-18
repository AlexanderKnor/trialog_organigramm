/**
 * Repository Interface: IWIFOImportRepository
 * Defines the contract for WIFO import batch persistence
 */

export class IWIFOImportRepository {
  /**
   * Save a WIFO import batch
   * @param {WIFOImportBatch} batch - The batch to save
   * @returns {Promise<WIFOImportBatch>}
   */
  async save(batch) {
    throw new Error('Method not implemented: save');
  }

  /**
   * Find a batch by ID
   * @param {string} id - The batch ID
   * @returns {Promise<WIFOImportBatch|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented: findById');
  }

  /**
   * Find all batches for a user
   * @param {string} userId - The user ID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Promise<WIFOImportBatch[]>}
   */
  async findByUserId(userId, options = {}) {
    throw new Error('Method not implemented: findByUserId');
  }

  /**
   * Find recent batches
   * @param {number} limit - Maximum number of batches
   * @returns {Promise<WIFOImportBatch[]>}
   */
  async findRecent(limit = 10) {
    throw new Error('Method not implemented: findRecent');
  }

  /**
   * Delete a batch by ID
   * @param {string} id - The batch ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * Update batch status
   * @param {string} id - The batch ID
   * @param {string} status - The new status
   * @returns {Promise<void>}
   */
  async updateStatus(id, status) {
    throw new Error('Method not implemented: updateStatus');
  }

  /**
   * Update batch statistics
   * @param {string} id - The batch ID
   * @param {Object} statistics - Updated statistics
   * @returns {Promise<void>}
   */
  async updateStatistics(id, statistics) {
    throw new Error('Method not implemented: updateStatistics');
  }
}
