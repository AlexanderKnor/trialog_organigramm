/**
 * Entity: LinkTree
 * The navigation aid of the knowledge board: a hand-curated path from a broad
 * heading down to a concrete destination.
 *
 * Persisted as ONE document (see LINK_TREE_ROOT_ID), unlike entries and
 * categories which are flat docs. Reordering is the dominant edit here and costs
 * a single write this way; the tree is always read whole, and no query ever
 * wants an individual node.
 *
 * Its structure is deliberately independent of the entry categories: it maps
 * navigation paths, not taxonomy, and the two evolve separately.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';
import { KnowledgeStatus, KNOWLEDGE_STATUS_TYPES } from '../value-objects/KnowledgeStatus.js';
import { LinkTreeNode } from './LinkTreeNode.js';

/** Singleton document id — there is exactly one link tree. */
export const LINK_TREE_ROOT_ID = 'knowledge_link_tree_root';

/** Beyond three levels the tree stops being a navigation aid and becomes a maze. */
export const MAX_TREE_DEPTH = 3;

export const MOVE_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
};

export class LinkTree {
  #id;
  #nodes;
  #status;
  #metadata;

  constructor({
    id = LINK_TREE_ROOT_ID,
    nodes = [],
    status = KNOWLEDGE_STATUS_TYPES.ACTIVE,
    metadata = null,
  } = {}) {
    if (!Array.isArray(nodes)) {
      throw new ValidationError('Link tree nodes must be an array', 'nodes');
    }

    this.#id = id;
    this.#nodes = nodes.map((node) => (node instanceof LinkTreeNode ? node : new LinkTreeNode(node)));
    this.#status = status instanceof KnowledgeStatus ? status : new KnowledgeStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});

    this.#validateDepth();
  }

  #validateDepth() {
    const depth = this.depth;
    if (depth > MAX_TREE_DEPTH) {
      throw new ValidationError(
        `Link tree must not be deeper than ${MAX_TREE_DEPTH} levels (is ${depth})`,
        'nodes'
      );
    }
  }

  get id() {
    return this.#id;
  }

  get nodes() {
    return [...this.#nodes];
  }

  get status() {
    return this.#status;
  }

  get metadata() {
    return this.#metadata;
  }

  get isEmpty() {
    return this.#nodes.length === 0;
  }

  get depth() {
    if (this.#nodes.length === 0) {
      return 0;
    }

    return Math.max(...this.#nodes.map((node) => node.depth));
  }

  /**
   * @param {string} nodeId
   * @returns {LinkTreeNode|null}
   */
  findNode(nodeId) {
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node;
        }

        const found = search(node.children);
        if (found) {
          return found;
        }
      }
      return null;
    };

    return search(this.#nodes);
  }

  /**
   * @param {string} nodeId
   * @returns {LinkTreeNode|null} the parent, or null when the node is top level
   */
  findParent(nodeId) {
    const search = (nodes, parent) => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return parent;
        }

        const found = search(node.children, node);
        if (found !== undefined) {
          return found;
        }
      }
      return undefined;
    };

    const result = search(this.#nodes, null);
    return result === undefined ? null : result;
  }

  /**
   * @param {string|null} parentId null appends at top level
   * @param {LinkTreeNode|Object} node
   */
  addNode(parentId, node) {
    const child = node instanceof LinkTreeNode ? node : new LinkTreeNode(node);

    if (parentId === null) {
      this.#nodes.push(child);
    } else {
      const parent = this.findNode(parentId);
      if (!parent) {
        throw new ValidationError(`Parent node not found: ${parentId}`, 'parentId');
      }
      parent.addChild(child);
    }

    this.#validateDepth();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateNode(nodeId, { label, icon, link }) {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new ValidationError(`Node not found: ${nodeId}`, 'nodeId');
    }

    if (label !== undefined) {
      node.updateLabel(label);
    }

    if (icon !== undefined) {
      node.updateIcon(icon);
    }

    if (link !== undefined) {
      node.updateLink(link);
    }

    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  /** Removes the node and, with it, its whole subtree. */
  removeNode(nodeId) {
    const parent = this.findParent(nodeId);

    if (parent === null) {
      this.#nodes = this.#nodes.filter((node) => node.id !== nodeId);
    } else {
      parent.removeChild(nodeId);
    }

    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  /**
   * Reorders a node among its siblings. A no-op at either end rather than an
   * error: the UI disables the button there, and wrapping around would surprise.
   *
   * @param {string} nodeId
   * @param {'up'|'down'} direction
   */
  moveNode(nodeId, direction) {
    const parent = this.findParent(nodeId);
    const siblings = parent === null ? this.#nodes : parent.children;
    const index = siblings.findIndex((node) => node.id === nodeId);

    if (index === -1) {
      throw new ValidationError(`Node not found: ${nodeId}`, 'nodeId');
    }

    const targetIndex = direction === MOVE_DIRECTIONS.UP ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return this;
    }

    [siblings[index], siblings[targetIndex]] = [siblings[targetIndex], siblings[index]];

    if (parent === null) {
      this.#nodes = siblings;
    } else {
      parent.setChildren(siblings);
    }

    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  toJSON() {
    return {
      entityType: 'knowledge_link_tree',
      id: this.#id,
      nodes: this.#nodes.map((node) => node.toJSON()),
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new LinkTree({
      id: json.id ?? LINK_TREE_ROOT_ID,
      nodes: (json.nodes ?? []).map((node) => LinkTreeNode.fromJSON(node)),
      status: json.status ?? KNOWLEDGE_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static createEmpty() {
    return new LinkTree({});
  }
}
