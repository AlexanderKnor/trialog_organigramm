/**
 * Entity: KnowledgeArticle
 * An editorial article in the knowledge base: a titled, categorized, ordered
 * sequence of text and image blocks, written by admins and read by everyone.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { ArticleBlock, isValidWebUrl } from '../value-objects/ArticleBlock.js';

const MAX_TITLE_LENGTH = 140;
const MAX_SUMMARY_LENGTH = 300;
const MAX_BLOCKS = 40;
const MAX_TAGS = 15;

export const ARTICLE_STATUS = Object.freeze({
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export class KnowledgeArticle {
  #id;
  #categoryType;
  #title;
  #summary;
  #heroImageUrl;
  #blocks;
  #tags;
  #pinned;
  #status;
  #createdAt;
  #updatedAt;

  constructor({
    id = null,
    categoryType,
    title,
    summary = '',
    heroImageUrl = '',
    blocks = [],
    tags = [],
    pinned = false,
    status = ARTICLE_STATUS.PUBLISHED,
    createdAt = null,
    updatedAt = null,
  }) {
    this.#validateCategoryType(categoryType);
    this.#validateTitle(title);
    this.#validateSummary(summary);
    this.#validateHeroImageUrl(heroImageUrl);
    this.#validateBlocks(blocks);
    this.#validateTags(tags);
    this.#validateStatus(status);

    const now = new Date().toISOString();

    this.#id = id || generateUUID();
    this.#categoryType = categoryType;
    this.#title = title.trim();
    this.#summary = summary.trim();
    this.#heroImageUrl = heroImageUrl.trim();
    this.#blocks = blocks.map((block) =>
      block instanceof ArticleBlock ? block : new ArticleBlock(block)
    );
    this.#tags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    this.#pinned = Boolean(pinned);
    this.#status = status;
    this.#createdAt = createdAt || now;
    this.#updatedAt = updatedAt || now;
  }

  // Only shape, not membership: topics are admin-managed documents, and an
  // article whose topic was renamed away must still load (it renders with a
  // neutral fallback instead of breaking the whole library).
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

  #validateSummary(summary) {
    if (typeof summary !== 'string') {
      throw new ValidationError('Summary must be a string', 'summary');
    }

    if (summary.length > MAX_SUMMARY_LENGTH) {
      throw new ValidationError(
        `Summary must not exceed ${MAX_SUMMARY_LENGTH} characters`,
        'summary'
      );
    }
  }

  #validateHeroImageUrl(heroImageUrl) {
    if (typeof heroImageUrl !== 'string') {
      throw new ValidationError('Hero image URL must be a string', 'heroImageUrl');
    }

    if (heroImageUrl.trim().length > 0 && !isValidWebUrl(heroImageUrl.trim())) {
      throw new ValidationError('Hero image URL must be a valid http(s) URL', 'heroImageUrl');
    }
  }

  #validateBlocks(blocks) {
    if (!Array.isArray(blocks)) {
      throw new ValidationError('Blocks must be an array', 'blocks');
    }

    if (blocks.length === 0) {
      throw new ValidationError('An article needs at least one content block', 'blocks');
    }

    if (blocks.length > MAX_BLOCKS) {
      throw new ValidationError(`An article must not exceed ${MAX_BLOCKS} blocks`, 'blocks');
    }
  }

  #validateTags(tags) {
    if (!Array.isArray(tags) || tags.length > MAX_TAGS) {
      throw new ValidationError(`Tags must be an array of at most ${MAX_TAGS} items`, 'tags');
    }
  }

  #validateStatus(status) {
    if (!Object.values(ARTICLE_STATUS).includes(status)) {
      throw new ValidationError(`Unknown article status: ${status}`, 'status');
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

  get summary() {
    return this.#summary;
  }

  get heroImageUrl() {
    return this.#heroImageUrl;
  }

  get blocks() {
    return [...this.#blocks];
  }

  get tags() {
    return [...this.#tags];
  }

  get pinned() {
    return this.#pinned;
  }

  get status() {
    return this.#status;
  }

  get isPublished() {
    return this.#status === ARTICLE_STATUS.PUBLISHED;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  /** Reading time in minutes, floor 1 — shown on cards, so it lives in the domain. */
  get readingMinutes() {
    const words = this.#blocks
      .map((block) => block.searchText.split(/\s+/).filter(Boolean).length)
      .reduce((sum, count) => sum + count, 0);

    return Math.max(1, Math.round(words / 200));
  }

  /** Returns a new instance with the given fields replaced and updatedAt touched. */
  withUpdates(updates) {
    return new KnowledgeArticle({
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
      summary: this.#summary,
      heroImageUrl: this.#heroImageUrl,
      blocks: this.#blocks.map((block) => block.toJSON()),
      tags: [...this.#tags],
      pinned: this.#pinned,
      status: this.#status,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }

  static fromJSON(data) {
    return new KnowledgeArticle(data || {});
  }
}
