/**
 * Value Object: KnowledgeLink
 * A single labelled link on a knowledge entry or link tree leaf.
 *
 * This constructor is the ONLY gate against hostile URLs. Both the editor and
 * the read path (fromJSON) route through it, so a URL written straight into
 * Firestore by hand is rejected on read just like one typed into the form.
 * Keep validation here rather than in the editor for that reason.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { LinkTarget, LINK_TARGET_TYPES } from './LinkTarget.js';

/**
 * Protocols an external link may use. Anything absent is rejected — notably
 * javascript:, data:, vbscript:, blob: and file:, which turn an admin-authored
 * href into script execution or local file access.
 */
const ALLOWED_PROTOCOLS = Object.freeze(['https:', 'http:', 'mailto:', 'tel:']);

/**
 * Internal links are app routes, so only the hash shape is checked. The domain
 * deliberately does not know the route table; an unknown hash lands on the
 * default route, which is acceptable for admin-authored content.
 */
const INTERNAL_HASH_PATTERN = /^#[a-z0-9\-/]*$/i;

const MAX_LABEL_LENGTH = 100;
const MAX_URL_LENGTH = 2000;

export class KnowledgeLink {
  #label;
  #url;
  #target;

  constructor({ label, url, target = LINK_TARGET_TYPES.EXTERNAL }) {
    this.#target = target instanceof LinkTarget ? target : new LinkTarget(target);

    this.#validateLabel(label);
    this.#validateUrl(url, this.#target);

    this.#label = label.trim();
    this.#url = url.trim();

    Object.freeze(this);
  }

  #validateLabel(label) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new ValidationError('Link label must be a non-empty string', 'label');
    }

    if (label.length > MAX_LABEL_LENGTH) {
      throw new ValidationError(
        `Link label must not exceed ${MAX_LABEL_LENGTH} characters`,
        'label'
      );
    }
  }

  #validateUrl(url, target) {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new ValidationError('Link URL must be a non-empty string', 'url');
    }

    if (url.length > MAX_URL_LENGTH) {
      throw new ValidationError(`Link URL must not exceed ${MAX_URL_LENGTH} characters`, 'url');
    }

    if (target.isInternal) {
      if (!INTERNAL_HASH_PATTERN.test(url.trim())) {
        throw new ValidationError(
          'Internal link must be an app route starting with # (e.g. #org)',
          'url'
        );
      }
      return;
    }

    if (!KnowledgeLink.isSupportedProtocol(url)) {
      throw new ValidationError(
        `External link must use one of: ${ALLOWED_PROTOCOLS.join(', ')}`,
        'url'
      );
    }
  }

  /**
   * Exported so the editor can give inline feedback without duplicating the
   * allowlist. The entity re-checks regardless — this is UX, not enforcement.
   *
   * @param {string} url
   * @returns {boolean}
   */
  static isSupportedProtocol(url) {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }

    let parsed;
    try {
      parsed = new URL(url.trim());
    } catch {
      // A URL that will not parse cannot be reasoned about; treat as unsupported.
      return false;
    }

    // Read protocol off the PARSED url, never off the raw string: new URL()
    // strips control characters and lower-cases the scheme, so obfuscations
    // like "java\tscript:" and "JaVaScRiPt:" collapse to their real protocol
    // here but would slip past a startsWith or regex on the input.
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  }

  get label() {
    return this.#label;
  }

  get url() {
    return this.#url;
  }

  get target() {
    return this.#target;
  }

  get isInternal() {
    return this.#target.isInternal;
  }

  get isExternal() {
    return this.#target.isExternal;
  }

  toJSON() {
    return {
      label: this.#label,
      url: this.#url,
      target: this.#target.toJSON(),
    };
  }

  static fromJSON(json) {
    return new KnowledgeLink({
      label: json.label,
      url: json.url,
      target: json.target ?? LINK_TARGET_TYPES.EXTERNAL,
    });
  }

  equals(other) {
    return (
      other instanceof KnowledgeLink &&
      this.#label === other.label &&
      this.#url === other.url &&
      this.#target.equals(other.target)
    );
  }

  toString() {
    return `${this.#label} (${this.#url})`;
  }
}
