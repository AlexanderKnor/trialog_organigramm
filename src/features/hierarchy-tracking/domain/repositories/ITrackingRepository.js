/**
 * Repository Interface: ITrackingRepository
 * Defines the contract for tracking event persistence
 */

export class ITrackingRepository {
  async save(event) {
    throw new Error('Method not implemented');
  }

  async findByTreeId(treeId) {
    throw new Error('Method not implemented');
  }

  async findByNodeId(nodeId) {
    throw new Error('Method not implemented');
  }

  async findByType(eventType) {
    throw new Error('Method not implemented');
  }

  async findByDateRange(startDate, endDate) {
    throw new Error('Method not implemented');
  }

  async findRecent(limit) {
    throw new Error('Method not implemented');
  }

  async deleteByTreeId(treeId) {
    throw new Error('Method not implemented');
  }

  async clear() {
    throw new Error('Method not implemented');
  }
}
