/**
 * Entity: TrackingEvent
 * Represents a tracking event in the hierarchy (for audit/history)
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { NodeMetadata } from '../value-objects/NodeMetadata.js';

export const EVENT_TYPES = Object.freeze({
  NODE_CREATED: 'node_created',
  NODE_UPDATED: 'node_updated',
  NODE_DELETED: 'node_deleted',
  NODE_MOVED: 'node_moved',
  NODE_REORDERED: 'node_reordered',
  TREE_CREATED: 'tree_created',
  TREE_UPDATED: 'tree_updated',
  TREE_EXPORTED: 'tree_exported',
  TREE_IMPORTED: 'tree_imported',
});

export class TrackingEvent {
  #id;
  #type;
  #treeId;
  #nodeId;
  #payload;
  #metadata;

  constructor({
    id = null,
    type,
    treeId,
    nodeId = null,
    payload = {},
    metadata = null,
  }) {
    this.#id = id || generateUUID();
    this.#validateType(type);

    this.#type = type;
    this.#treeId = treeId;
    this.#nodeId = nodeId;
    this.#payload = Object.freeze({ ...payload });
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});

    Object.freeze(this);
  }

  #validateType(type) {
    const validTypes = Object.values(EVENT_TYPES);
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid event type: ${type}`);
    }
  }

  get id() {
    return this.#id;
  }

  get type() {
    return this.#type;
  }

  get treeId() {
    return this.#treeId;
  }

  get nodeId() {
    return this.#nodeId;
  }

  get payload() {
    return { ...this.#payload };
  }

  get metadata() {
    return this.#metadata;
  }

  get timestamp() {
    return this.#metadata.createdAt;
  }

  toJSON() {
    return {
      id: this.#id,
      type: this.#type,
      treeId: this.#treeId,
      nodeId: this.#nodeId,
      payload: { ...this.#payload },
      metadata: this.#metadata.toJSON(),
    };
  }

  static fromJSON(json) {
    return new TrackingEvent({
      id: json.id,
      type: json.type,
      treeId: json.treeId,
      nodeId: json.nodeId,
      payload: json.payload,
      metadata: json.metadata ? NodeMetadata.fromJSON(json.metadata) : null,
    });
  }

  static nodeCreated(treeId, nodeId, nodeName) {
    return new TrackingEvent({
      type: EVENT_TYPES.NODE_CREATED,
      treeId,
      nodeId,
      payload: { nodeName },
    });
  }

  static nodeUpdated(treeId, nodeId, changes) {
    return new TrackingEvent({
      type: EVENT_TYPES.NODE_UPDATED,
      treeId,
      nodeId,
      payload: { changes },
    });
  }

  static nodeDeleted(treeId, nodeId, nodeName) {
    return new TrackingEvent({
      type: EVENT_TYPES.NODE_DELETED,
      treeId,
      nodeId,
      payload: { nodeName },
    });
  }

  static nodeMoved(treeId, nodeId, fromParentId, toParentId) {
    return new TrackingEvent({
      type: EVENT_TYPES.NODE_MOVED,
      treeId,
      nodeId,
      payload: { fromParentId, toParentId },
    });
  }

  static treeCreated(treeId, treeName) {
    return new TrackingEvent({
      type: EVENT_TYPES.TREE_CREATED,
      treeId,
      payload: { treeName },
    });
  }
}
