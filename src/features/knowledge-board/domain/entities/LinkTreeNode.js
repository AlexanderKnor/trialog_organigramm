/**
 * Entity: LinkTreeNode
 * One node of the link tree. Branches group; leaves carry a link.
 * A node may hold both a link and children — a branch that is itself a target.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { KnowledgeLink } from '../value-objects/KnowledgeLink.js';

const MAX_LABEL_LENGTH = 80;

export class LinkTreeNode {
  #id;
  #label;
  #icon;
  #link;
  #children;

  constructor({ id = null, label, icon = null, link = null, children = [] }) {
    this.#validateLabel(label);
    this.#validateChildren(children);

    this.#id = id || generateUUID();
    this.#label = label.trim();
    this.#icon = icon;
    this.#link = link ? (link instanceof KnowledgeLink ? link : new KnowledgeLink(link)) : null;
    this.#children = children.map((child) =>
      child instanceof LinkTreeNode ? child : new LinkTreeNode(child)
    );
  }

  #validateLabel(label) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new ValidationError('Node label must be a non-empty string', 'label');
    }

    if (label.length > MAX_LABEL_LENGTH) {
      throw new ValidationError(`Node label must not exceed ${MAX_LABEL_LENGTH} characters`, 'label');
    }
  }

  #validateChildren(children) {
    if (!Array.isArray(children)) {
      throw new ValidationError('Node children must be an array', 'children');
    }
  }

  get id() {
    return this.#id;
  }

  get label() {
    return this.#label;
  }

  get icon() {
    return this.#icon;
  }

  get link() {
    return this.#link;
  }

  get children() {
    return [...this.#children];
  }

  get hasChildren() {
    return this.#children.length > 0;
  }

  get isLeaf() {
    return this.#children.length === 0;
  }

  /** Depth of the subtree rooted here, counting this node as 1. */
  get depth() {
    if (this.isLeaf) {
      return 1;
    }

    return 1 + Math.max(...this.#children.map((child) => child.depth));
  }

  updateLabel(label) {
    this.#validateLabel(label);
    this.#label = label.trim();
    return this;
  }

  updateIcon(icon) {
    this.#icon = icon;
    return this;
  }

  updateLink(link) {
    this.#link = link ? (link instanceof KnowledgeLink ? link : new KnowledgeLink(link)) : null;
    return this;
  }

  addChild(node) {
    this.#children.push(node instanceof LinkTreeNode ? node : new LinkTreeNode(node));
    return this;
  }

  removeChild(nodeId) {
    this.#children = this.#children.filter((child) => child.id !== nodeId);
    return this;
  }

  setChildren(children) {
    this.#validateChildren(children);
    this.#children = [...children];
    return this;
  }

  toJSON() {
    return {
      id: this.#id,
      label: this.#label,
      icon: this.#icon,
      link: this.#link ? this.#link.toJSON() : null,
      children: this.#children.map((child) => child.toJSON()),
    };
  }

  static fromJSON(json) {
    return new LinkTreeNode({
      id: json.id,
      label: json.label,
      icon: json.icon ?? null,
      link: json.link ?? null,
      children: (json.children ?? []).map((child) => LinkTreeNode.fromJSON(child)),
    });
  }

  static create(label, { icon = null, link = null } = {}) {
    return new LinkTreeNode({ label, icon, link });
  }
}
