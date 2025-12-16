/**
 * Value Object: NodeType
 * Represents the type/category of a hierarchy node
 */

import { ValidationError } from '../../../../core/errors/index.js';

export const NODE_TYPES = Object.freeze({
  ROOT: 'root',
  DEPARTMENT: 'department',
  TEAM: 'team',
  ROLE: 'role',
  PERSON: 'person',
  PROCESS: 'process',
  TASK: 'task',
  MILESTONE: 'milestone',
  CUSTOM: 'custom',
});

export class NodeType {
  #value;
  #label;
  #icon;
  #color;

  constructor(value, label = null, icon = null, color = null) {
    this.#validate(value);
    this.#value = value;
    this.#label = label || this.#getDefaultLabel(value);
    this.#icon = icon || this.#getDefaultIcon(value);
    this.#color = color || this.#getDefaultColor(value);
    Object.freeze(this);
  }

  #validate(value) {
    const validTypes = Object.values(NODE_TYPES);
    if (!validTypes.includes(value)) {
      throw new ValidationError(`Invalid node type: ${value}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  #getDefaultLabel(value) {
    const labels = {
      [NODE_TYPES.ROOT]: 'Organisation',
      [NODE_TYPES.DEPARTMENT]: 'Abteilung',
      [NODE_TYPES.TEAM]: 'Team',
      [NODE_TYPES.ROLE]: 'Rolle',
      [NODE_TYPES.PERSON]: 'Person',
      [NODE_TYPES.PROCESS]: 'Prozess',
      [NODE_TYPES.TASK]: 'Aufgabe',
      [NODE_TYPES.MILESTONE]: 'Meilenstein',
      [NODE_TYPES.CUSTOM]: 'Benutzerdefiniert',
    };
    return labels[value] || value;
  }

  #getDefaultIcon(value) {
    const icons = {
      [NODE_TYPES.ROOT]: '🏢',
      [NODE_TYPES.DEPARTMENT]: '📁',
      [NODE_TYPES.TEAM]: '👥',
      [NODE_TYPES.ROLE]: '🎭',
      [NODE_TYPES.PERSON]: '👤',
      [NODE_TYPES.PROCESS]: '⚙️',
      [NODE_TYPES.TASK]: '📋',
      [NODE_TYPES.MILESTONE]: '🎯',
      [NODE_TYPES.CUSTOM]: '📌',
    };
    return icons[value] || '📌';
  }

  #getDefaultColor(value) {
    const colors = {
      [NODE_TYPES.ROOT]: '#10274c',
      [NODE_TYPES.DEPARTMENT]: '#1a3a6e',
      [NODE_TYPES.TEAM]: '#2a5298',
      [NODE_TYPES.ROLE]: '#3a6ac8',
      [NODE_TYPES.PERSON]: '#4a7ad8',
      [NODE_TYPES.PROCESS]: '#5a8ae8',
      [NODE_TYPES.TASK]: '#6a9af8',
      [NODE_TYPES.MILESTONE]: '#7aaaff',
      [NODE_TYPES.CUSTOM]: '#8abaff',
    };
    return colors[value] || '#10274c';
  }

  get value() {
    return this.#value;
  }

  get label() {
    return this.#label;
  }

  get icon() {
    return this.#icon;
  }

  get color() {
    return this.#color;
  }

  equals(other) {
    if (!(other instanceof NodeType)) {
      return false;
    }
    return this.#value === other.value;
  }

  toJSON() {
    return {
      value: this.#value,
      label: this.#label,
      icon: this.#icon,
      color: this.#color,
    };
  }

  static fromJSON(json) {
    if (typeof json === 'string') {
      return new NodeType(json);
    }
    return new NodeType(json.value, json.label, json.icon, json.color);
  }

  static root() {
    return new NodeType(NODE_TYPES.ROOT);
  }

  static department() {
    return new NodeType(NODE_TYPES.DEPARTMENT);
  }

  static team() {
    return new NodeType(NODE_TYPES.TEAM);
  }

  static person() {
    return new NodeType(NODE_TYPES.PERSON);
  }
}
