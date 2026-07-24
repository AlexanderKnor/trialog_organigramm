/**
 * Domain Service: KnowledgeService
 * Orchestrates knowledge board management operations.
 *
 * Note there is no admin check anywhere in here. Write access is enforced by
 * firestore.rules; a JS guard would read like enforcement while being trivially
 * bypassable from the console. See KnowledgeBoardPanel for the same reasoning
 * applied to the UI affordances.
 */

import { KnowledgeCategory } from '../entities/KnowledgeCategory.js';
import { KnowledgeEntry } from '../entities/KnowledgeEntry.js';
import { LinkTree } from '../entities/LinkTree.js';
import { ValidationError, NotFoundError } from '../../../../core/errors/index.js';
import { Logger } from './../../../../core/utils/logger.js';

export class KnowledgeService {
  #knowledgeRepository;

  constructor(knowledgeRepository) {
    this.#knowledgeRepository = knowledgeRepository;
  }

  // ========================================
  // CATEGORY OPERATIONS
  // ========================================

  async getAllCategories(includeInactive = false) {
    return this.#knowledgeRepository.findAllCategories(includeInactive);
  }

  async getCategoryByType(categoryType) {
    return this.#knowledgeRepository.findCategoryByType(categoryType);
  }

  async createCategory(categoryData) {
    const existing = await this.#knowledgeRepository.findCategoryByType(categoryData.type);
    if (existing) {
      throw new ValidationError(
        `Eine Kategorie mit dem Typ '${categoryData.type}' existiert bereits`,
        'type'
      );
    }

    await this.#assertDisplayNameIsFree(categoryData.displayName);

    const category = KnowledgeCategory.create(
      categoryData.type,
      categoryData.displayName,
      categoryData.icon
    );

    if (categoryData.order !== undefined) {
      category.updateOrder(categoryData.order);
    }

    await this.#knowledgeRepository.saveCategory(category);
    Logger.log(`✓ Knowledge category created: ${category.displayName} (${category.type})`);

    return category;
  }

  async updateCategory(categoryType, updates) {
    const category = await this.#knowledgeRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('KnowledgeCategory', categoryType);
    }

    if (updates.displayName !== undefined && updates.displayName !== category.displayName) {
      await this.#assertDisplayNameIsFree(updates.displayName, category.type);
      category.updateDisplayName(updates.displayName);
    }

    if (updates.icon !== undefined) {
      category.updateIcon(updates.icon);
    }

    if (updates.order !== undefined) {
      category.updateOrder(updates.order);
    }

    await this.#knowledgeRepository.saveCategory(category);
    Logger.log(`✓ Knowledge category updated: ${category.displayName}`);

    return category;
  }

  /**
   * Hard-deletes the category and every entry filed under it. Entries carry no
   * value once their category is gone — unlike catalog categories, nothing
   * outside this feature references them, so there is no integrity check to run.
   */
  async deleteCategory(categoryType) {
    const category = await this.#knowledgeRepository.findCategoryByType(categoryType);

    if (!category) {
      throw new NotFoundError('KnowledgeCategory', categoryType);
    }

    const entries = await this.#knowledgeRepository.findAllEntries(true);
    const affected = entries.filter((entry) => entry.categoryType === categoryType);

    for (const entry of affected) {
      await this.#knowledgeRepository.deleteEntry(entry.id);
    }

    await this.#knowledgeRepository.deleteCategory(categoryType);
    Logger.log(`✓ Knowledge category deleted: ${categoryType} (${affected.length} entries removed)`);
  }

  async #assertDisplayNameIsFree(displayName, excludeType = null) {
    const categories = await this.#knowledgeRepository.findAllCategories(true);
    const clash = categories.find(
      (category) =>
        category.type !== excludeType &&
        category.displayName.toLowerCase() === String(displayName).toLowerCase()
    );

    if (clash) {
      throw new ValidationError(
        `Eine Kategorie mit dem Namen '${displayName}' existiert bereits`,
        'displayName'
      );
    }
  }

  // ========================================
  // ENTRY OPERATIONS
  // ========================================

  async getAllEntries(includeInactive = false) {
    return this.#knowledgeRepository.findAllEntries(includeInactive);
  }

  async getEntryById(entryId) {
    return this.#knowledgeRepository.findEntryById(entryId);
  }

  async createEntry(entryData) {
    const category = await this.#knowledgeRepository.findCategoryByType(entryData.categoryType);
    if (!category) {
      throw new ValidationError(
        `Die Kategorie '${entryData.categoryType}' existiert nicht`,
        'categoryType'
      );
    }

    const entry = KnowledgeEntry.create(entryData.categoryType, entryData.title);

    entry.updateContent({
      description: entryData.description,
      partnerName: entryData.partnerName,
      partnerContact: entryData.partnerContact,
    });

    if (entryData.links !== undefined) {
      entry.updateLinks(entryData.links);
    }

    if (entryData.tags !== undefined) {
      entry.updateTags(entryData.tags);
    }

    if (entryData.reviewIntervalDays !== undefined) {
      entry.updateReviewInterval(entryData.reviewIntervalDays);
    }

    if (entryData.lastReviewedAt !== undefined) {
      entry.updateLastReviewedAt(entryData.lastReviewedAt);
    }

    await this.#knowledgeRepository.saveEntry(entry);
    Logger.log(`✓ Knowledge entry created: ${entry.title}`);

    return entry;
  }

  async updateEntry(entryId, updates) {
    const entry = await this.#knowledgeRepository.findEntryById(entryId);

    if (!entry) {
      throw new NotFoundError('KnowledgeEntry', entryId);
    }

    if (updates.categoryType !== undefined) {
      const category = await this.#knowledgeRepository.findCategoryByType(updates.categoryType);
      if (!category) {
        throw new ValidationError(
          `Die Kategorie '${updates.categoryType}' existiert nicht`,
          'categoryType'
        );
      }
    }

    entry.updateContent(updates);

    if (updates.links !== undefined) {
      entry.updateLinks(updates.links);
    }

    if (updates.tags !== undefined) {
      entry.updateTags(updates.tags);
    }

    if (updates.reviewIntervalDays !== undefined) {
      entry.updateReviewInterval(updates.reviewIntervalDays);
    }

    if (updates.lastReviewedAt !== undefined) {
      entry.updateLastReviewedAt(updates.lastReviewedAt);
    }

    await this.#knowledgeRepository.saveEntry(entry);
    Logger.log(`✓ Knowledge entry updated: ${entry.title}`);

    return entry;
  }

  /** The one-click action behind the freshness badge. */
  async markEntryReviewed(entryId) {
    const entry = await this.#knowledgeRepository.findEntryById(entryId);

    if (!entry) {
      throw new NotFoundError('KnowledgeEntry', entryId);
    }

    entry.markReviewed();
    await this.#knowledgeRepository.saveEntry(entry);
    Logger.log(`✓ Knowledge entry marked reviewed: ${entry.title}`);

    return entry;
  }

  async deleteEntry(entryId) {
    const entry = await this.#knowledgeRepository.findEntryById(entryId);

    if (!entry) {
      throw new NotFoundError('KnowledgeEntry', entryId);
    }

    await this.#knowledgeRepository.deleteEntry(entryId);
    Logger.log(`✓ Knowledge entry deleted: ${entry.title}`);
  }

  // ========================================
  // LINK TREE OPERATIONS
  // ========================================

  /** Always returns a tree; an absent document means an empty one, not an error. */
  async getLinkTree() {
    const linkTree = await this.#knowledgeRepository.findLinkTree();
    return linkTree || LinkTree.createEmpty();
  }

  async addLinkTreeNode(parentId, nodeData) {
    const linkTree = await this.getLinkTree();
    linkTree.addNode(parentId, nodeData);

    await this.#knowledgeRepository.saveLinkTree(linkTree);
    Logger.log(`✓ Link tree node added: ${nodeData.label}`);

    return linkTree;
  }

  async updateLinkTreeNode(nodeId, updates) {
    const linkTree = await this.getLinkTree();
    linkTree.updateNode(nodeId, updates);

    await this.#knowledgeRepository.saveLinkTree(linkTree);
    Logger.log(`✓ Link tree node updated: ${nodeId}`);

    return linkTree;
  }

  async removeLinkTreeNode(nodeId) {
    const linkTree = await this.getLinkTree();
    linkTree.removeNode(nodeId);

    await this.#knowledgeRepository.saveLinkTree(linkTree);
    Logger.log(`✓ Link tree node removed: ${nodeId}`);

    return linkTree;
  }

  async moveLinkTreeNode(nodeId, direction) {
    const linkTree = await this.getLinkTree();
    linkTree.moveNode(nodeId, direction);

    await this.#knowledgeRepository.saveLinkTree(linkTree);

    return linkTree;
  }
}
