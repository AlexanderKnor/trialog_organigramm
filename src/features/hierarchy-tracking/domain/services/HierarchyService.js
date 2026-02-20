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
import { GESCHAEFTSFUEHRER_IDS, buildGeschaeftsfuehrerNode } from '../../../../core/config/geschaeftsfuehrer.config.js';

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

    // Add node to local tree
    tree.addNode(node, parentId);

    // Try to save - rollback on failure
    try {
      await this.#hierarchyRepository.save(tree);
      Logger.log(`✓ Node saved to backend: ${node.name}`);
    } catch (saveError) {
      // ROLLBACK: Remove node from local tree
      Logger.error(`❌ Failed to save node to backend, rolling back: ${saveError.message}`);
      try {
        tree.removeNode(node.id);
      } catch (rollbackError) {
        Logger.warn('Rollback also failed:', rollbackError.message);
      }
      throw new Error(`Speichern fehlgeschlagen: ${saveError.message}`);
    }

    // Only track after successful save
    try {
      await this.#trackingRepository.save(TrackingEvent.nodeCreated(treeId, node.id, node.name));
    } catch (trackingError) {
      Logger.warn('Tracking event save failed:', trackingError.message);
      // Don't fail the operation for tracking errors
    }

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
    // Load fresh tree from backend
    const tree = await this.#hierarchyRepository.findById(treeId);

    // Check if node exists in backend
    if (!tree.hasNode(nodeId)) {
      throw new Error('Mitarbeiter existiert nicht im Backend. Bitte Seite neu laden.');
    }

    // Store original values for rollback
    const node = tree.getNode(nodeId);
    const originalValues = {
      name: node.name,
      description: node.description,
      type: node.type,
      email: node.email,
      phone: node.phone,
      bankProvision: node.bankProvision,
      realEstateProvision: node.realEstateProvision,
      insuranceProvision: node.insuranceProvision,
    };

    // Apply updates
    tree.updateNode(nodeId, updates);

    // Try to save - rollback on failure
    try {
      await this.#hierarchyRepository.save(tree);
      Logger.log(`✓ Node updated in backend: ${node.name}`);
    } catch (saveError) {
      // ROLLBACK: Restore original values
      Logger.error(`❌ Failed to save node update, rolling back: ${saveError.message}`);
      tree.updateNode(nodeId, originalValues);
      throw new Error(`Speichern fehlgeschlagen: ${saveError.message}`);
    }

    // Track update (don't fail on tracking errors)
    try {
      await this.#trackingRepository.save(TrackingEvent.nodeUpdated(treeId, nodeId, updates));
    } catch (trackingError) {
      Logger.warn('Tracking event save failed:', trackingError.message);
    }

    return node;
  }

  async removeNode(treeId, nodeId) {
    // First, load fresh tree from backend to ensure we have the latest state
    const tree = await this.#hierarchyRepository.findById(treeId);

    // Check if node actually exists in the backend tree
    if (!tree.hasNode(nodeId)) {
      Logger.warn(`⚠ Node ${nodeId} not found in backend tree - may be local-only orphan`);
      throw new Error('Mitarbeiter existiert nicht im Backend. Bitte Seite neu laden.');
    }

    const node = tree.getNode(nodeId);
    const nodeName = node.name;

    // Remove node from tree
    tree.removeNode(nodeId);

    // Save to backend
    try {
      await this.#hierarchyRepository.save(tree);
      Logger.log(`✓ Node removed from backend: ${nodeName}`);
    } catch (saveError) {
      Logger.error(`❌ Failed to save after removing node: ${saveError.message}`);
      throw new Error(`Löschen fehlgeschlagen: ${saveError.message}`);
    }

    // Track deletion (don't fail on tracking errors)
    try {
      await this.#trackingRepository.save(TrackingEvent.nodeDeleted(treeId, nodeId, nodeName));
    } catch (trackingError) {
      Logger.warn('Tracking event save failed:', trackingError.message);
    }
  }

  async moveNode(treeId, nodeId, newParentId) {
    // Load fresh tree from backend
    const tree = await this.#hierarchyRepository.findById(treeId);

    // Check if node exists
    if (!tree.hasNode(nodeId)) {
      throw new Error('Mitarbeiter existiert nicht im Backend. Bitte Seite neu laden.');
    }

    const node = tree.getNode(nodeId);
    const fromParentId = node.parentId;

    // Move node
    tree.moveNode(nodeId, newParentId);

    // Try to save - rollback on failure
    try {
      await this.#hierarchyRepository.save(tree);
      Logger.log(`✓ Node moved in backend: ${node.name}`);
    } catch (saveError) {
      // ROLLBACK: Move back to original parent
      Logger.error(`❌ Failed to save node move, rolling back: ${saveError.message}`);
      if (fromParentId) {
        tree.moveNode(nodeId, fromParentId);
      }
      throw new Error(`Verschieben fehlgeschlagen: ${saveError.message}`);
    }

    // Track move (don't fail on tracking errors)
    try {
      await this.#trackingRepository.save(
        TrackingEvent.nodeMoved(treeId, nodeId, fromParentId, newParentId),
      );
    } catch (trackingError) {
      Logger.warn('Tracking event save failed:', trackingError.message);
    }
  }

  async reorderChildren(treeId, parentId, childIds) {
    // Load fresh tree from backend
    const tree = await this.#hierarchyRepository.findById(treeId);

    // Check if parent exists
    if (!tree.hasNode(parentId)) {
      throw new Error('Übergeordneter Knoten existiert nicht im Backend. Bitte Seite neu laden.');
    }

    // Store original order for rollback
    const parent = tree.getNode(parentId);
    const originalChildIds = [...parent.childIds];

    // Reorder
    tree.reorderChildren(parentId, childIds);

    // Try to save - rollback on failure
    try {
      await this.#hierarchyRepository.save(tree);
      Logger.log(`✓ Children reordered in backend`);
    } catch (saveError) {
      // ROLLBACK: Restore original order
      Logger.error(`❌ Failed to save reorder, rolling back: ${saveError.message}`);
      tree.reorderChildren(parentId, originalChildIds);
      throw new Error(`Sortierung fehlgeschlagen: ${saveError.message}`);
    }
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

  /**
   * Get all employees from the tree (excluding root) plus Geschäftsführer
   * Used for WIFO import employee matching
   * @param {string} treeId - Optional tree ID, uses first tree if not provided
   * @returns {Promise<Array<{id: string, name: string, firstName: string, lastName: string}>>}
   */
  async getAllEmployees(treeId = null) {
    let tree;

    if (treeId) {
      tree = await this.#hierarchyRepository.findById(treeId);
    } else {
      const allTrees = await this.#hierarchyRepository.findAll();
      tree = allTrees.length > 0 ? allTrees[0] : null;
    }

    const employees = [];

    // Add Geschäftsführer (they are not in the tree but can have revenue entries)
    const geschaeftsfuehrer = GESCHAEFTSFUEHRER_IDS.map(id => {
      const node = buildGeschaeftsfuehrerNode(id);
      return {
        ...node,
        email: node.email || '',
      };
    });
    employees.push(...geschaeftsfuehrer);

    if (tree && tree.rootId) {
      this.#collectEmployeesRecursive(tree, tree.rootId, employees);
    }

    return employees;
  }

  /**
   * Recursively collect all employees from a tree
   * @param {HierarchyTree} tree - The tree to traverse
   * @param {string} nodeId - Current node ID
   * @param {Array} result - Result array to populate
   */
  #collectEmployeesRecursive(tree, nodeId, result) {
    const children = tree.getChildren(nodeId);

    for (const child of children) {
      // Parse name to extract firstName and lastName
      const nameParts = this.#parseEmployeeName(child.name);

      result.push({
        id: child.id,
        name: child.name,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: child.email || '',
        bankProvision: child.bankProvision || 0,
        insuranceProvision: child.insuranceProvision || 0,
        realEstateProvision: child.realEstateProvision || 0,
      });

      // Recurse into children
      this.#collectEmployeesRecursive(tree, child.id, result);
    }
  }

  /**
   * Parse employee name into firstName and lastName
   * Handles formats: "FirstName LastName" and "LastName, FirstName"
   * @param {string} name - Full name
   * @returns {{firstName: string, lastName: string}}
   */
  #parseEmployeeName(name) {
    if (!name) {
      return { firstName: '', lastName: '' };
    }

    // Check for "LastName, FirstName" format
    if (name.includes(',')) {
      const [lastName, firstName] = name.split(',').map((s) => s.trim());
      return { firstName: firstName || '', lastName: lastName || '' };
    }

    // Check for "FirstName LastName" format
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts.slice(0, -1).join(' ');
      const lastName = parts[parts.length - 1];
      return { firstName, lastName };
    }

    // Single name - assume it's a lastName
    return { firstName: '', lastName: name.trim() };
  }
}
