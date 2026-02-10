/**
 * Entity: HierarchyNode
 * Core domain entity representing a node in the hierarchy structure
 */

import { generateUUID, isValidUUID } from '../../../../core/utils/index.js';
import { ValidationError, HierarchyError } from '../../../../core/errors/index.js';
import { NodePosition } from '../value-objects/NodePosition.js';
import { NodeMetadata } from '../value-objects/NodeMetadata.js';
import { NodeType, NODE_TYPES } from '../value-objects/NodeType.js';

export class HierarchyNode {
  #id;
  #name;
  #description;
  #type;
  #position;
  #metadata;
  #parentId;
  #childIds;
  #isExpanded;
  #isVisible;
  #order;
  #email;
  #phone;
  #bankProvision;
  #realEstateProvision;
  #insuranceProvision;

  constructor({
    id = null,
    name,
    description = '',
    type = NODE_TYPES.CUSTOM,
    position = null,
    metadata = null,
    parentId = null,
    childIds = [],
    isExpanded = true,
    isVisible = true,
    order = 0,
    email = '',
    phone = '',
    bankProvision = 0,
    realEstateProvision = 0,
    insuranceProvision = 0,
  }) {
    this.#id = id || generateUUID();
    this.#validateId(this.#id);
    this.#validateName(name);

    this.#name = name;
    this.#description = description;
    this.#type = type instanceof NodeType ? type : new NodeType(type);
    this.#position = position instanceof NodePosition ? position : NodePosition.origin();
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
    this.#parentId = parentId;
    this.#childIds = [...childIds];
    this.#isExpanded = isExpanded;
    this.#isVisible = isVisible;
    this.#order = order;
    this.#email = email;
    this.#phone = phone;
    this.#bankProvision = this.#validateProvision(bankProvision);
    this.#realEstateProvision = this.#validateProvision(realEstateProvision);
    this.#insuranceProvision = this.#validateProvision(insuranceProvision);
  }

  #validateProvision(value) {
    const num = parseFloat(value) || 0;
    return Math.max(0, Math.min(100, num));
  }

  #validateId(id) {
    if (!isValidUUID(id)) {
      throw new ValidationError('Invalid node ID format', 'id');
    }
  }

  #validateName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Node name must be a non-empty string', 'name');
    }
    if (name.length > 200) {
      throw new ValidationError('Node name must not exceed 200 characters', 'name');
    }
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

  get type() {
    return this.#type;
  }

  get position() {
    return this.#position;
  }

  get metadata() {
    return this.#metadata;
  }

  get parentId() {
    return this.#parentId;
  }

  get childIds() {
    return [...this.#childIds];
  }

  get isExpanded() {
    return this.#isExpanded;
  }

  get isVisible() {
    return this.#isVisible;
  }

  get order() {
    return this.#order;
  }

  get email() {
    return this.#email;
  }

  get phone() {
    return this.#phone;
  }

  get bankProvision() {
    return this.#bankProvision;
  }

  get realEstateProvision() {
    return this.#realEstateProvision;
  }

  get insuranceProvision() {
    return this.#insuranceProvision;
  }

  get totalProvision() {
    return this.#bankProvision + this.#realEstateProvision + this.#insuranceProvision;
  }

  get isRoot() {
    return this.#parentId === null;
  }

  get hasChildren() {
    return this.#childIds.length > 0;
  }

  get childCount() {
    return this.#childIds.length;
  }

  updateName(name) {
    this.#validateName(name);
    this.#name = name;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateDescription(description) {
    this.#description = description || '';
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updatePosition(position) {
    if (!(position instanceof NodePosition)) {
      throw new ValidationError('Position must be a NodePosition instance');
    }
    this.#position = position;
    return this;
  }

  updateType(type) {
    this.#type = type instanceof NodeType ? type : new NodeType(type);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  setParent(parentId) {
    if (parentId === this.#id) {
      throw new HierarchyError('A node cannot be its own parent');
    }
    this.#parentId = parentId;
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  addChild(childId) {
    if (childId === this.#id) {
      throw new HierarchyError('A node cannot be its own child');
    }
    if (!this.#childIds.includes(childId)) {
      this.#childIds.push(childId);
      this.#metadata = this.#metadata.withUpdatedTimestamp();
    }
    return this;
  }

  removeChild(childId) {
    const index = this.#childIds.indexOf(childId);
    if (index !== -1) {
      this.#childIds.splice(index, 1);
      this.#metadata = this.#metadata.withUpdatedTimestamp();
    }
    return this;
  }

  expand() {
    this.#isExpanded = true;
    return this;
  }

  collapse() {
    this.#isExpanded = false;
    return this;
  }

  toggleExpand() {
    this.#isExpanded = !this.#isExpanded;
    return this;
  }

  show() {
    this.#isVisible = true;
    return this;
  }

  hide() {
    this.#isVisible = false;
    return this;
  }

  setOrder(order) {
    if (typeof order !== 'number' || order < 0) {
      throw new ValidationError('Order must be a non-negative number');
    }
    this.#order = order;
    return this;
  }

  updateEmail(email) {
    this.#email = email || '';
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updatePhone(phone) {
    this.#phone = phone || '';
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateBankProvision(value) {
    this.#bankProvision = this.#validateProvision(value);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateRealEstateProvision(value) {
    this.#realEstateProvision = this.#validateProvision(value);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateInsuranceProvision(value) {
    this.#insuranceProvision = this.#validateProvision(value);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  clone(newId = null) {
    return new HierarchyNode({
      id: newId || generateUUID(),
      name: `${this.#name} (Copy)`,
      description: this.#description,
      type: this.#type.value,
      position: this.#position,
      metadata: null,
      parentId: this.#parentId,
      childIds: [],
      isExpanded: this.#isExpanded,
      isVisible: this.#isVisible,
      order: this.#order,
      email: this.#email,
      phone: this.#phone,
      bankProvision: this.#bankProvision,
      realEstateProvision: this.#realEstateProvision,
      insuranceProvision: this.#insuranceProvision,
    });
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      description: this.#description,
      type: this.#type.toJSON(),
      position: this.#position.toJSON(),
      metadata: this.#metadata.toJSON(),
      parentId: this.#parentId,
      childIds: [...this.#childIds],
      isExpanded: this.#isExpanded,
      isVisible: this.#isVisible,
      order: this.#order,
      email: this.#email,
      phone: this.#phone,
      bankProvision: this.#bankProvision,
      realEstateProvision: this.#realEstateProvision,
      insuranceProvision: this.#insuranceProvision,
    };
  }

  static fromJSON(json) {
    return new HierarchyNode({
      id: json.id,
      name: json.name,
      description: json.description,
      type: json.type?.value || json.type,
      position: json.position ? NodePosition.fromJSON(json.position) : null,
      metadata: json.metadata ? NodeMetadata.fromJSON(json.metadata) : null,
      parentId: json.parentId,
      childIds: json.childIds || [],
      isExpanded: json.isExpanded ?? true,
      isVisible: json.isVisible ?? true,
      order: json.order ?? 0,
      email: json.email ?? '',
      phone: json.phone ?? '',
      bankProvision: json.bankProvision ?? 0,
      realEstateProvision: json.realEstateProvision ?? 0,
      insuranceProvision: json.insuranceProvision ?? 0,
    });
  }

  static createRoot(name, description = '') {
    return new HierarchyNode({
      name,
      description,
      type: NODE_TYPES.ROOT,
      parentId: null,
      bankProvision: 100,
      realEstateProvision: 100,
      insuranceProvision: 100,
    });
  }
}
