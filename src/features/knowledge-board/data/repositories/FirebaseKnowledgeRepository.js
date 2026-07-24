/**
 * Repository: FirebaseKnowledgeRepository
 * Maps between knowledge board entities and their Firestore representation.
 *
 * No try/catch here by design: the data source already wraps failures as
 * StorageError, and the presentation layer is the single catch site.
 */

import { IKnowledgeRepository } from '../../domain/repositories/IKnowledgeRepository.js';
import { KnowledgeCategory } from '../../domain/entities/KnowledgeCategory.js';
import { KnowledgeEntry } from '../../domain/entities/KnowledgeEntry.js';
import { LinkTree, LINK_TREE_ROOT_ID } from '../../domain/entities/LinkTree.js';

const ENTITY_TYPES = Object.freeze({
  CATEGORY: 'knowledge_category',
  ENTRY: 'knowledge_entry',
});

export class FirebaseKnowledgeRepository extends IKnowledgeRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async findAllCategories(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType(ENTITY_TYPES.CATEGORY, includeInactive);
    return data
      .map((item) => KnowledgeCategory.fromJSON(item))
      .sort((a, b) => a.order - b.order || a.displayName.localeCompare(b.displayName, 'de'));
  }

  async findCategoryByType(categoryType) {
    // Categories use a deterministic id, so the type resolves without a query.
    const docId = `knowledge_category_${categoryType}`;
    const data = await this.#dataSource.findById(docId);

    return data ? KnowledgeCategory.fromJSON(data) : null;
  }

  async saveCategory(category) {
    await this.#dataSource.save(category.toJSON());
    return category;
  }

  async deleteCategory(categoryType) {
    await this.#dataSource.delete(`knowledge_category_${categoryType}`);
  }

  // ========================================
  // ENTRY OPERATIONS
  // ========================================

  async findAllEntries(includeInactive = false) {
    const data = await this.#dataSource.findByEntityType(ENTITY_TYPES.ENTRY, includeInactive);
    return data.map((item) => KnowledgeEntry.fromJSON(item));
  }

  async findEntryById(entryId) {
    const data = await this.#dataSource.findById(entryId);

    if (!data || data.entityType !== ENTITY_TYPES.ENTRY) {
      return null;
    }

    return KnowledgeEntry.fromJSON(data);
  }

  async saveEntry(entry) {
    await this.#dataSource.save(entry.toJSON());
    return entry;
  }

  async deleteEntry(entryId) {
    await this.#dataSource.delete(entryId);
  }

  // ========================================
  // LINK TREE OPERATIONS
  // ========================================

  async findLinkTree() {
    const data = await this.#dataSource.findById(LINK_TREE_ROOT_ID);
    return data ? LinkTree.fromJSON(data) : null;
  }

  async saveLinkTree(linkTree) {
    await this.#dataSource.save(linkTree.toJSON());
    return linkTree;
  }
}
