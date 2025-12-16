/**
 * Aggregate Root: HierarchyTree
 * Manages the complete hierarchy structure
 */

import { generateUUID, isValidUUID } from '../../../../core/utils/index.js';
import { ValidationError, NotFoundError, HierarchyError } from '../../../../core/errors/index.js';
import { HierarchyNode } from './HierarchyNode.js';
import { NodeMetadata } from '../value-objects/NodeMetadata.js';
import { APP_CONFIG } from '../../../../core/config/index.js';

export class HierarchyTree {
  #id;
  #name;
  #description;
  #nodes;
  #rootId;
  #metadata;

  constructor({
    id = null,
    name,
    description = '',
    nodes = new Map(),
    rootId = null,
    metadata = null,
  }) {
    this.#id = id || generateUUID();
    this.#validateName(name);

    this.#name = name;
    this.#description = description;
    this.#nodes = nodes instanceof Map ? nodes : new Map(Object.entries(nodes));
    this.#rootId = rootId;
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Tree name must be a non-empty string', 'name');
    }
  }

  #validateDepth(nodeId, newParentId) {
    let depth = 0;
    let currentId = newParentId;

    while (currentId !== null) {
      depth++;
      if (depth > APP_CONFIG.hierarchy.maxDepth) {
        throw new HierarchyError(`Maximum hierarchy depth of ${APP_CONFIG.hierarchy.maxDepth} exceeded`);
      }
      const parent = this.#nodes.get(currentId);
      if (!parent) break;
      currentId = parent.parentId;
    }
  }

  #detectCycle(nodeId, potentialParentId) {
    if (nodeId === potentialParentId) {
      return true;
    }

    const descendants = this.getDescendants(nodeId);
    return descendants.some((d) => d.id === potentialParentId);
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get description() {
    return this.#description;
  }

  get rootId() {
    return this.#rootId;
  }

  get metadata() {
    return this.#metadata;
  }

  get nodeCount() {
    return this.#nodes.size;
  }

  get root() {
    return this.#rootId ? this.#nodes.get(this.#rootId) : null;
  }

  getNode(nodeId) {
    const node = this.#nodes.get(nodeId);
    if (!node) {
      throw new NotFoundError('HierarchyNode', nodeId);
    }
    return node;
  }

  hasNode(nodeId) {
    return this.#nodes.has(nodeId);
  }

  getAllNodes() {
    return Array.from(this.#nodes.values());
  }

  getChildren(nodeId) {
    const node = this.getNode(nodeId);
    return node.childIds.map((id) => this.#nodes.get(id)).filter(Boolean);
  }

  getParent(nodeId) {
    const node = this.getNode(nodeId);
    return node.parentId ? this.#nodes.get(node.parentId) : null;
  }

  getAncestors(nodeId) {
    const ancestors = [];
    let currentNode = this.getNode(nodeId);

    while (currentNode.parentId) {
      const parent = this.#nodes.get(currentNode.parentId);
      if (!parent) break;
      ancestors.push(parent);
      currentNode = parent;
    }

    return ancestors;
  }

  getDescendants(nodeId) {
    const descendants = [];
    const stack = [...this.getChildren(nodeId)];

    while (stack.length > 0) {
      const node = stack.pop();
      descendants.push(node);
      stack.push(...this.getChildren(node.id));
    }

    return descendants;
  }

  getSiblings(nodeId) {
    const node = this.getNode(nodeId);
    if (!node.parentId) return [];

    const parent = this.#nodes.get(node.parentId);
    if (!parent) return [];

    return parent.childIds
      .filter((id) => id !== nodeId)
      .map((id) => this.#nodes.get(id))
      .filter(Boolean);
  }

  getDepth(nodeId) {
    let depth = 0;
    let currentNode = this.getNode(nodeId);

    while (currentNode.parentId) {
      depth++;
      const parent = this.#nodes.get(currentNode.parentId);
      if (!parent) break;
      currentNode = parent;
    }

    return depth;
  }

  getMaxDepth() {
    let maxDepth = 0;

    for (const node of this.#nodes.values()) {
      const depth = this.getDepth(node.id);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    return maxDepth;
  }

  addNode(node, parentId = null) {
    if (!(node instanceof HierarchyNode)) {
      throw new ValidationError('Node must be a HierarchyNode instance');
    }

    if (this.#nodes.has(node.id)) {
      throw new HierarchyError(`Node with id '${node.id}' already exists in the tree`);
    }

    if (parentId !== null) {
      this.#validateDepth(node.id, parentId);
      const parent = this.getNode(parentId);
      node.setParent(parentId);
      parent.addChild(node.id);
    } else if (this.#rootId === null) {
      this.#rootId = node.id;
    } else {
      throw new HierarchyError('Cannot add root node: tree already has a root');
    }

    this.#nodes.set(node.id, node);
    this.#metadata = this.#metadata.withUpdatedTimestamp();

    return node;
  }

  removeNode(nodeId) {
    const node = this.getNode(nodeId);

    if (node.isRoot && node.hasChildren) {
      throw new HierarchyError('Cannot remove root node with children');
    }

    // Move children up to the deleted node's parent instead of deleting them
    const children = this.getChildren(nodeId);
    const parentId = node.parentId;

    if (parentId && children.length > 0) {
      // Move all children to the parent (they move up one level)
      const parent = this.#nodes.get(parentId);
      for (const child of children) {
        child.setParent(parentId);
        if (parent) {
          parent.addChild(child.id);
        }
      }
    } else if (!parentId && children.length > 0) {
      // If deleting a root node, promote first child to root
      const newRoot = children[0];
      newRoot.setParent(null);
      this.#rootId = newRoot.id;

      // Move other children under the new root
      for (let i = 1; i < children.length; i++) {
        children[i].setParent(newRoot.id);
        newRoot.addChild(children[i].id);
      }
    }

    // Remove node from parent's children list
    if (node.parentId) {
      const parent = this.#nodes.get(node.parentId);
      if (parent) {
        parent.removeChild(nodeId);
      }
    }

    if (this.#rootId === nodeId && children.length === 0) {
      this.#rootId = null;
    }

    this.#nodes.delete(nodeId);
    this.#metadata = this.#metadata.withUpdatedTimestamp();

    return this;
  }

  moveNode(nodeId, newParentId) {
    if (nodeId === newParentId) {
      throw new HierarchyError('Cannot move node to itself');
    }

    const node = this.getNode(nodeId);

    if (node.isRoot) {
      throw new HierarchyError('Cannot move root node');
    }

    if (this.#detectCycle(nodeId, newParentId)) {
      throw new HierarchyError('Cannot move node: would create a cycle');
    }

    this.#validateDepth(nodeId, newParentId);

    if (node.parentId) {
      const oldParent = this.#nodes.get(node.parentId);
      if (oldParent) {
        oldParent.removeChild(nodeId);
      }
    }

    const newParent = this.getNode(newParentId);
    node.setParent(newParentId);
    newParent.addChild(nodeId);

    this.#metadata = this.#metadata.withUpdatedTimestamp();

    return this;
  }

  updateNode(nodeId, updates) {
    const node = this.getNode(nodeId);

    if (updates.name !== undefined) {
      node.updateName(updates.name);
    }
    if (updates.description !== undefined) {
      node.updateDescription(updates.description);
    }
    if (updates.type !== undefined) {
      node.updateType(updates.type);
    }
    if (updates.position !== undefined) {
      node.updatePosition(updates.position);
    }
    if (updates.email !== undefined) {
      node.updateEmail(updates.email);
    }
    if (updates.phone !== undefined) {
      node.updatePhone(updates.phone);
    }
    if (updates.bankProvision !== undefined) {
      node.updateBankProvision(updates.bankProvision);
    }
    if (updates.realEstateProvision !== undefined) {
      node.updateRealEstateProvision(updates.realEstateProvision);
    }
    if (updates.insuranceProvision !== undefined) {
      node.updateInsuranceProvision(updates.insuranceProvision);
    }

    this.#metadata = this.#metadata.withUpdatedTimestamp();

    return node;
  }

  reorderChildren(parentId, childIds) {
    const parent = this.getNode(parentId);
    const currentChildIds = parent.childIds;

    if (childIds.length !== currentChildIds.length) {
      throw new ValidationError('Child IDs count mismatch');
    }

    const sortedCurrentIds = [...currentChildIds].sort();
    const sortedNewIds = [...childIds].sort();

    if (!sortedCurrentIds.every((id, i) => id === sortedNewIds[i])) {
      throw new ValidationError('Child IDs do not match existing children');
    }

    childIds.forEach((childId, index) => {
      const child = this.#nodes.get(childId);
      if (child) {
        child.setOrder(index);
      }
    });

    this.#metadata = this.#metadata.withUpdatedTimestamp();

    return this;
  }

  traverse(callback, startNodeId = null) {
    const startId = startNodeId || this.#rootId;
    if (!startId) return;

    const stack = [{ node: this.#nodes.get(startId), depth: 0 }];

    while (stack.length > 0) {
      const { node, depth } = stack.pop();
      if (!node) continue;

      const shouldContinue = callback(node, depth);
      if (shouldContinue === false) break;

      const children = this.getChildren(node.id);
      children.sort((a, b) => a.order - b.order);

      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], depth: depth + 1 });
      }
    }
  }

  filter(predicate) {
    return Array.from(this.#nodes.values()).filter(predicate);
  }

  find(predicate) {
    return Array.from(this.#nodes.values()).find(predicate);
  }

  toJSON() {
    const nodesArray = Array.from(this.#nodes.values()).map((node) => node.toJSON());

    return {
      id: this.#id,
      name: this.#name,
      description: this.#description,
      rootId: this.#rootId,
      nodes: nodesArray,
      metadata: this.#metadata.toJSON(),
    };
  }

  static fromJSON(json) {
    const nodesMap = new Map();

    if (json.nodes) {
      json.nodes.forEach((nodeJson) => {
        const node = HierarchyNode.fromJSON(nodeJson);
        nodesMap.set(node.id, node);
      });
    }

    return new HierarchyTree({
      id: json.id,
      name: json.name,
      description: json.description,
      nodes: nodesMap,
      rootId: json.rootId,
      metadata: json.metadata ? NodeMetadata.fromJSON(json.metadata) : null,
    });
  }

  static create(name, description = '') {
    return new HierarchyTree({ name, description });
  }
}
