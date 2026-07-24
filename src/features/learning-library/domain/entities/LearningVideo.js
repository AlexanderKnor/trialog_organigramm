/**
 * Entity: LearningVideo
 * One training video in the library: a categorized recording (Loom-first),
 * curated by admins.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { VideoSource } from '../value-objects/VideoSource.js';

const MAX_TITLE_LENGTH = 140;

export class LearningVideo {
  #id;
  #categoryType;
  #title;
  #source;
  #createdAt;
  #updatedAt;

  constructor({
    id = null,
    categoryType,
    title,
    shareUrl,
    createdAt = null,
    updatedAt = null,
  }) {
    this.#validateCategoryType(categoryType);
    this.#validateTitle(title);

    const now = new Date().toISOString();

    this.#id = id || generateUUID();
    this.#categoryType = categoryType;
    this.#title = title.trim();
    this.#source = new VideoSource(shareUrl);
    this.#createdAt = createdAt || now;
    this.#updatedAt = updatedAt || now;
  }

  // Only shape, not membership — see KnowledgeArticle for the reasoning.
  #validateCategoryType(categoryType) {
    if (typeof categoryType !== 'string' || categoryType.trim().length === 0) {
      throw new ValidationError('Category type must be a non-empty string', 'categoryType');
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

  get id() {
    return this.#id;
  }

  get categoryType() {
    return this.#categoryType;
  }

  get title() {
    return this.#title;
  }

  get source() {
    return this.#source;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  /** Returns a new instance with the given fields replaced and updatedAt touched. */
  withUpdates(updates) {
    return new LearningVideo({
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
      categoryType: this.#categoryType,
      title: this.#title,
      shareUrl: this.#source.shareUrl,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }

  static fromJSON(data) {
    return new LearningVideo(data || {});
  }
}
