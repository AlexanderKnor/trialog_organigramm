/**
 * Value Object: NodePosition
 * Represents the position of a node in the hierarchy visualization
 */

import { ValidationError } from '../../../../core/errors/index.js';

export class NodePosition {
  #x;
  #y;

  constructor(x, y) {
    this.#validate(x, y);
    this.#x = x;
    this.#y = y;
    Object.freeze(this);
  }

  #validate(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new ValidationError('Position coordinates must be numbers');
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new ValidationError('Position coordinates must be finite numbers');
    }
  }

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  translate(deltaX, deltaY) {
    return new NodePosition(this.#x + deltaX, this.#y + deltaY);
  }

  distanceTo(other) {
    if (!(other instanceof NodePosition)) {
      throw new ValidationError('Comparison must be with another NodePosition');
    }
    const dx = this.#x - other.x;
    const dy = this.#y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  equals(other) {
    if (!(other instanceof NodePosition)) {
      return false;
    }
    return this.#x === other.x && this.#y === other.y;
  }

  toJSON() {
    return { x: this.#x, y: this.#y };
  }

  static fromJSON(json) {
    return new NodePosition(json.x, json.y);
  }

  static origin() {
    return new NodePosition(0, 0);
  }
}
