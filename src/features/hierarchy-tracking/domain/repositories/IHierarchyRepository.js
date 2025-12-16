/**
 * Repository Interface: IHierarchyRepository
 * Defines the contract for hierarchy persistence operations
 */

export class IHierarchyRepository {
  async save(tree) {
    throw new Error('Method not implemented');
  }

  async findById(treeId) {
    throw new Error('Method not implemented');
  }

  async findAll() {
    throw new Error('Method not implemented');
  }

  async delete(treeId) {
    throw new Error('Method not implemented');
  }

  async exists(treeId) {
    throw new Error('Method not implemented');
  }

  async clear() {
    throw new Error('Method not implemented');
  }
}
