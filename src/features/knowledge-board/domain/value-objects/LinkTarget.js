/**
 * Value Object: LinkTarget
 * Distinguishes links into the app itself from links to partner sites.
 * Drives both validation (see KnowledgeLink) and rendering (new tab or not).
 */

export const LINK_TARGET_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};

export class LinkTarget {
  #target;

  constructor(target = LINK_TARGET_TYPES.EXTERNAL) {
    if (!Object.values(LINK_TARGET_TYPES).includes(target)) {
      throw new Error(`Invalid link target: ${target}`);
    }
    this.#target = target;
  }

  get target() {
    return this.#target;
  }

  get isInternal() {
    return this.#target === LINK_TARGET_TYPES.INTERNAL;
  }

  get isExternal() {
    return this.#target === LINK_TARGET_TYPES.EXTERNAL;
  }

  toJSON() {
    return this.#target;
  }

  static fromJSON(json) {
    return new LinkTarget(json);
  }

  equals(other) {
    return other instanceof LinkTarget && this.#target === other.target;
  }

  toString() {
    return this.#target;
  }
}
