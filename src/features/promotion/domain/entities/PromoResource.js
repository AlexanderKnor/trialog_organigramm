/**
 * Entity: PromoResource
 * One linked marketing asset (a shared folder, a template document, an event
 * page), shelved under a ResourceKind.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { isResourceKindType } from '../value-objects/ResourceKind.js';

const MAX_TITLE_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

const isValidHttpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export class PromoResource {
  #id;
  #kindType;
  #title;
  #description;
  #url;
  #createdAt;
  #updatedAt;

  constructor({
    id = null,
    kindType,
    title,
    description = '',
    url,
    createdAt = null,
    updatedAt = null,
  }) {
    this.#validateKindType(kindType);
    this.#validateTitle(title);
    this.#validateDescription(description);
    this.#validateUrl(url);

    const now = new Date().toISOString();

    this.#id = id || generateUUID();
    this.#kindType = kindType;
    this.#title = title.trim();
    this.#description = description.trim();
    this.#url = url.trim();
    this.#createdAt = createdAt || now;
    this.#updatedAt = updatedAt || now;
  }

  #validateKindType(kindType) {
    if (!isResourceKindType(kindType)) {
      throw new ValidationError(`Unknown resource kind: ${kindType}`, 'kindType');
    }
  }

  #validateTitle(title) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Title must be a non-empty string', 'title');
    }

    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Title must not exceed ${MAX_TITLE_LENGTH} characters`, 'title');
    }
  }

  #validateDescription(description) {
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(
        `Description must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters`,
        'description'
      );
    }
  }

  #validateUrl(url) {
    if (typeof url !== 'string' || url.trim().length === 0 || url.length > MAX_URL_LENGTH) {
      throw new ValidationError('Resource URL is required', 'url');
    }

    if (!isValidHttpUrl(url.trim())) {
      throw new ValidationError('Resource URL must be a valid http(s) URL', 'url');
    }
  }

  get id() {
    return this.#id;
  }

  get kindType() {
    return this.#kindType;
  }

  get title() {
    return this.#title;
  }

  get description() {
    return this.#description;
  }

  get url() {
    return this.#url;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  withUpdates(updates) {
    return new PromoResource({
      ...this.toJSON(),
      ...updates,
      id: this.#id,
      createdAt: this.#createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON() {
    return {
      id: this.#id,
      kindType: this.#kindType,
      title: this.#title,
      description: this.#description,
      url: this.#url,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }

  static fromJSON(data) {
    return new PromoResource(data || {});
  }
}
