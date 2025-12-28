/**
 * Domain Service: HierarchyService
 * Orchestrates domain operations for hierarchy management
 */

import { HierarchyTree } from '../entities/HierarchyTree.js';
import { HierarchyNode } from '../entities/HierarchyNode.js';
import { TrackingEvent } from '../entities/TrackingEvent.js';
import { NODE_TYPES } from '../value-objects/NodeType.js';
import { APP_CONFIG } from '../../../../core/config/app.config.js';
import { Logger } from './../../../../core/utils/logger.js';

export class HierarchyService {
  #hierarchyRepository;
  #trackingRepository;
  #authService;

  constructor(hierarchyRepository, trackingRepository, authService = null) {
    this.#hierarchyRepository = hierarchyRepository;
    this.#trackingRepository = trackingRepository;
    this.#authService = authService;
  }

  async createTree(name, description = '') {
    // Single Tree Policy: Only one tree allowed - check first
    const allTrees = await this.getAllTrees();

    if (allTrees.length > 0) {
      Logger.warn('⚠ Organization tree already exists - returning existing tree');
      return allTrees[0];
    }

    // Create THE organization tree
    const tree = HierarchyTree.create(name, description);

    await this.#hierarchyRepository.save(tree);
    await this.#trackingRepository.save(TrackingEvent.treeCreated(tree.id, name));

    Logger.log('✓ Created THE organization tree:', tree.id);
    return tree;
  }

  async getTree(treeId) {
    return await this.#hierarchyRepository.findById(treeId);
  }

  async treeExists(treeId) {
    return await this.#hierarchyRepository.exists(treeId);
  }

  async getAllTrees() {
    return await this.#hierarchyRepository.findAll();
  }

  async deleteTree(treeId) {
    await this.#trackingRepository.deleteByTreeId(treeId);
    await this.#hierarchyRepository.delete(treeId);
  }

  async addNode(treeId, nodeData, parentId = null) {
    const tree = await this.#hierarchyRepository.findById(treeId);

    const node = new HierarchyNode({
      name: nodeData.name,
      description: nodeData.description,
      type: nodeData.type || NODE_TYPES.CUSTOM,
      email: nodeData.email || '',
      phone: nodeData.phone || '',
      bankProvision: nodeData.bankProvision || 0,
      realEstateProvision: nodeData.realEstateProvision || 0,
      insuranceProvision: nodeData.insuranceProvision || 0,
    });

    tree.addNode(node, parentId);
    await this.#hierarchyRepository.save(tree);
    await this.#trackingRepository.save(TrackingEvent.nodeCreated(treeId, node.id, node.name));

    // Create Firebase account for employee if email and password are provided
    if (this.#authService && nodeData.email && nodeData.email.trim() !== '' && nodeData.password) {
      try {
        const result = await this.#authService.createEmployeeAccount(
          nodeData.email,
          nodeData.name,
          nodeData.password
        );

        if (result.success) {
          Logger.log(`✓ Firebase account created for ${nodeData.name}`);
        } else {
          Logger.warn(`⚠ Failed to create account: ${result.error}`);
        }
      } catch (error) {
        Logger.warn(`⚠ Account creation failed for ${nodeData.email}:`, error.message);
        // Don't fail the node creation if account creation fails
      }
    }

    return node;
  }

  async updateNode(treeId, nodeId, updates) {
    const tree = await this.#hierarchyRepository.findById(treeId);
    const node = tree.updateNode(nodeId, updates);

    await this.#hierarchyRepository.save(tree);
    await this.#trackingRepository.save(TrackingEvent.nodeUpdated(treeId, nodeId, updates));

    return node;
  }

  async removeNode(treeId, nodeId) {
    const tree = await this.#hierarchyRepository.findById(treeId);
    const node = tree.getNode(nodeId);
    const nodeName = node.name;

    tree.removeNode(nodeId);
    await this.#hierarchyRepository.save(tree);
    await this.#trackingRepository.save(TrackingEvent.nodeDeleted(treeId, nodeId, nodeName));
  }

  async moveNode(treeId, nodeId, newParentId) {
    const tree = await this.#hierarchyRepository.findById(treeId);
    const node = tree.getNode(nodeId);
    const fromParentId = node.parentId;

    tree.moveNode(nodeId, newParentId);
    await this.#hierarchyRepository.save(tree);
    await this.#trackingRepository.save(
      TrackingEvent.nodeMoved(treeId, nodeId, fromParentId, newParentId),
    );
  }

  async reorderChildren(treeId, parentId, childIds) {
    const tree = await this.#hierarchyRepository.findById(treeId);
    tree.reorderChildren(parentId, childIds);
    await this.#hierarchyRepository.save(tree);
  }

  async getTreeHistory(treeId, limit = 50) {
    return await this.#trackingRepository.findByTreeId(treeId);
  }

  /**
   * Subscribe to real-time updates for a tree
   * @param {string} treeId - The tree ID to subscribe to
   * @param {Function} callback - Callback function receiving updated tree
   * @returns {Promise<Function>} Unsubscribe function
   */
  subscribeToTreeUpdates(treeId, callback) {
    // Check if repository supports real-time subscriptions
    if (typeof this.#hierarchyRepository.subscribeToTree === 'function') {
      return this.#hierarchyRepository.subscribeToTree(treeId, callback);
    }

    // Fallback: no-op for repositories without real-time support
    Logger.warn('Repository does not support real-time subscriptions');
    return Promise.resolve(() => {});
  }

  async exportTree(tree) {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tree: tree.toJSON(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importTree(jsonString) {
    const importData = JSON.parse(jsonString);
    const tree = HierarchyTree.fromJSON(importData.tree);

    await this.#hierarchyRepository.save(tree);

    return tree;
  }
}
