/**
 * Repository Implementation: FirebaseHierarchyRepository
 * Implements IHierarchyRepository using Firebase Firestore
 */

import { IHierarchyRepository } from '../../domain/repositories/IHierarchyRepository.js';
import { HierarchyTree } from '../../domain/entities/HierarchyTree.js';
import { NotFoundError } from '../../../../core/errors/index.js';

const TREE_PREFIX = 'hierarchy_tree_';

export class FirebaseHierarchyRepository extends IHierarchyRepository {
  #dataSource;

  constructor(dataSource) {
    super();
    this.#dataSource = dataSource;
  }

  #getTreeKey(treeId) {
    return `${TREE_PREFIX}${treeId}`;
  }

  async save(tree) {
    if (!(tree instanceof HierarchyTree)) {
      throw new Error('Invalid tree object');
    }

    const treeJson = tree.toJSON();
    await this.#dataSource.save(this.#getTreeKey(tree.id), treeJson);

    return tree;
  }

  async findById(treeId) {
    const treeJson = await this.#dataSource.load(this.#getTreeKey(treeId));

    if (!treeJson) {
      throw new NotFoundError('HierarchyTree', treeId);
    }

    return HierarchyTree.fromJSON(treeJson);
  }

  async findAll() {
    const keys = await this.#dataSource.getAllKeys();
    const trees = [];

    for (const key of keys) {
      try {
        const treeId = key.replace(TREE_PREFIX, '');
        const tree = await this.findById(treeId);
        trees.push(tree);
      } catch (error) {
        console.warn(`Failed to load tree from key ${key}:`, error);
      }
    }

    return trees;
  }

  async delete(treeId) {
    await this.#dataSource.remove(this.#getTreeKey(treeId));
    return true;
  }

  async exists(treeId) {
    return await this.#dataSource.exists(this.#getTreeKey(treeId));
  }

  async clear() {
    await this.#dataSource.clear();
  }

  /**
   * Subscribe to real-time updates for a specific tree
   * Returns unsubscribe function
   */
  subscribeToTree(treeId, callback) {
    const subscribeFunc = async () => {
      const { firebaseApp } = await import('../../../../core/firebase/index.js');
      const { doc, onSnapshot } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      const { FIRESTORE_COLLECTIONS } = await import('../../../../core/config/firebase.config.js');

      const firestore = firebaseApp.firestore;
      const docRef = doc(firestore, FIRESTORE_COLLECTIONS.HIERARCHY_TREES, treeId.replace('hierarchy_tree_', ''));

      let isFirstSnapshot = true;

      return onSnapshot(docRef, (snapshot) => {
        // Skip the first snapshot (initial data already loaded)
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          console.log('✓ Tree listener initialized (skipping initial snapshot)');
          return;
        }

        if (snapshot.exists()) {
          const treeJson = snapshot.data();
          const tree = HierarchyTree.fromJSON(treeJson);
          console.log(`🔄 Real-time update: Tree ${tree.name} changed (remote)`);
          callback(tree);
        } else {
          console.warn(`⚠ Tree ${treeId} was deleted`);
          callback(null);
        }
      }, (error) => {
        console.error('Real-time listener error:', error);
      });
    };

    // Return the promise that resolves to the unsubscribe function
    return subscribeFunc();
  }
}
