/**
 * Value Object: Topic
 * One admin-managed filter topic (category chip) of a portal content area.
 * Shared between the knowledge base and the learning library: both areas need
 * the identical create/rename/restyle/reorder/delete mechanics, only their
 * collection names and default catalogs differ.
 *
 * Icon and tint are constrained to curated sets: every value here has finished
 * chip, emblem and thumbnail styling in both features, so an admin-created
 * topic can never arrive unstyled.
 */

import { generateUUID } from '../../../core/utils/index.js';
import { ValidationError } from '../../../core/errors/index.js';

export const MAX_TOPIC_LABEL_LENGTH = 40;

export const TOPIC_TINTS = Object.freeze([
  'blue',
  'gold',
  'green',
  'purple',
  'teal',
  'slate',
]);

export const TOPIC_ICONS = Object.freeze([
  'fileText',
  'book',
  'copy',
  'layers',
  'refresh',
  'info',
  'lock',
  'userCheck',
  'users',
  'briefcase',
  'trendingUp',
  'star',
  'tag',
  'calendar',
  'video',
  'chart',
]);

export class Topic {
  #id;
  #label;
  #icon;
  #tint;
  #order;

  constructor({ id = null, label, icon, tint, order = 0 }) {
    this.#validateLabel(label);
    this.#validateIcon(icon);
    this.#validateTint(tint);
    this.#validateOrder(order);

    this.#id = id || generateUUID();
    this.#label = label.trim();
    this.#icon = icon;
    this.#tint = tint;
    this.#order = order;
  }

  #validateLabel(label) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new ValidationError('Topic label must be a non-empty string', 'label');
    }

    if (label.trim().length > MAX_TOPIC_LABEL_LENGTH) {
      throw new ValidationError(
        `Topic label must not exceed ${MAX_TOPIC_LABEL_LENGTH} characters`,
        'label'
      );
    }
  }

  #validateIcon(icon) {
    if (!TOPIC_ICONS.includes(icon)) {
      throw new ValidationError(`Unknown topic icon: ${icon}`, 'icon');
    }
  }

  #validateTint(tint) {
    if (!TOPIC_TINTS.includes(tint)) {
      throw new ValidationError(`Unknown topic tint: ${tint}`, 'tint');
    }
  }

  #validateOrder(order) {
    if (!Number.isInteger(order) || order < 0) {
      throw new ValidationError('Topic order must be a non-negative integer', 'order');
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

  get tint() {
    return this.#tint;
  }

  get order() {
    return this.#order;
  }

  toJSON() {
    return {
      id: this.#id,
      label: this.#label,
      icon: this.#icon,
      tint: this.#tint,
      order: this.#order,
    };
  }

  static fromJSON(data) {
    return new Topic(data || {});
  }
}
