/**
 * Repository Interface: IKnowledgeRepository
 * Defines contract for knowledge board data persistence
 */

export class IKnowledgeRepository {
  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async findAllCategories(includeInactive = false) {
    throw new Error('Method not implemented: findAllCategories');
  }

  async findCategoryByType(categoryType) {
    throw new Error('Method not implemented: findCategoryByType');
  }

  async saveCategory(category) {
    throw new Error('Method not implemented: saveCategory');
  }

  async deleteCategory(categoryType) {
    throw new Error('Method not implemented: deleteCategory');
  }

  // ========================================
  // ENTRY OPERATIONS
  // ========================================

  async findAllEntries(includeInactive = false) {
    throw new Error('Method not implemented: findAllEntries');
  }

  async findEntryById(entryId) {
    throw new Error('Method not implemented: findEntryById');
  }

  async saveEntry(entry) {
    throw new Error('Method not implemented: saveEntry');
  }

  async deleteEntry(entryId) {
    throw new Error('Method not implemented: deleteEntry');
  }

  // ========================================
  // LINK TREE OPERATIONS
  // ========================================

  async findLinkTree() {
    throw new Error('Method not implemented: findLinkTree');
  }

  async saveLinkTree(linkTree) {
    throw new Error('Method not implemented: saveLinkTree');
  }
}
