/**
 * Repository Implementation: LocalHierarchyRepository
 * Implements IHierarchyRepository using LocalStorage
 */

import { IHierarchyRepository } from '../../domain/repositories/IHierarchyRepository.js';
import { HierarchyTree } from '../../domain/entities/HierarchyTree.js';
import { NotFoundError } from '../../../../core/errors/index.js';

const TREES_INDEX_KEY = 'hierarchy_trees_index';
const TREE_PREFIX = 'hierarchy_tree_';

export class LocalHierarchyRepository extends IHierarchyRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  #getTreeKey(treeId) {
    return `${TREE_PREFIX}${treeId}`;
  }

  #getTreesIndex() {
    return this.#dataSource.load(TREES_INDEX_KEY) || [];
  }

  #saveTreesIndex(index) {
    this.#dataSource.save(TREES_INDEX_KEY, index);
  }

  async save(tree) {
    if (!(tree instanceof HierarchyTree)) {
      throw new Error('Invalid tree object');
    }

    const treeJson = tree.toJSON();
    this.#dataSource.save(this.#getTreeKey(tree.id), treeJson);

    const index = this.#getTreesIndex();
    if (!index.includes(tree.id)) {
      index.push(tree.id);
      this.#saveTreesIndex(index);
    }

    return tree;
  }

  async findById(treeId) {
    const treeJson = this.#dataSource.load(this.#getTreeKey(treeId));

    if (!treeJson) {
      throw new NotFoundError('HierarchyTree', treeId);
    }

    return HierarchyTree.fromJSON(treeJson);
  }

  async findAll() {
    const index = this.#getTreesIndex();
    const trees = [];

    for (const treeId of index) {
      try {
        const tree = await this.findById(treeId);
        trees.push(tree);
      } catch (error) {
        console.warn(`Failed to load tree ${treeId}:`, error);
      }
    }

    return trees;
  }

  async delete(treeId) {
    const index = this.#getTreesIndex();
    const filteredIndex = index.filter((id) => id !== treeId);

    this.#saveTreesIndex(filteredIndex);
    this.#dataSource.remove(this.#getTreeKey(treeId));

    return true;
  }

  async exists(treeId) {
    return this.#dataSource.exists(this.#getTreeKey(treeId));
  }

  async clear() {
    const index = this.#getTreesIndex();

    for (const treeId of index) {
      this.#dataSource.remove(this.#getTreeKey(treeId));
    }

    this.#dataSource.remove(TREES_INDEX_KEY);
  }
}
