/**
 * Entity: KnowledgeEntry
 * A single piece of partner/product knowledge: what it is, who the partner is,
 * where to go next, and when someone last confirmed it still holds.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { NodeMetadata } from '../../../hierarchy-tracking/domain/value-objects/NodeMetadata.js';
import { KnowledgeStatus, KNOWLEDGE_STATUS_TYPES } from '../value-objects/KnowledgeStatus.js';
import { KnowledgeLink } from '../value-objects/KnowledgeLink.js';
import { Freshness } from '../value-objects/Freshness.js';

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_PARTNER_NAME_LENGTH = 100;
const MAX_PARTNER_CONTACT_LENGTH = 200;
const MAX_LINKS = 20;
const MAX_TAGS = 15;

export class KnowledgeEntry {
  #id;
  #categoryType;
  #title;
  #description;
  #partnerName;
  #partnerContact;
  #links;
  #tags;
  #freshness;
  #status;
  #metadata;

  constructor({
    id = null,
    categoryType,
    title,
    description = '',
    partnerName = '',
    partnerContact = '',
    links = [],
    tags = [],
    freshness = null,
    status = KNOWLEDGE_STATUS_TYPES.ACTIVE,
    metadata = null,
  }) {
    this.#validateCategoryType(categoryType);
    this.#validateTitle(title);
    this.#validateDescription(description);
    this.#validatePartnerName(partnerName);
    this.#validatePartnerContact(partnerContact);
    this.#validateLinks(links);
    this.#validateTags(tags);

    this.#id = id || generateUUID();
    this.#categoryType = categoryType;
    this.#title = title.trim();
    this.#description = description;
    this.#partnerName = partnerName.trim();
    this.#partnerContact = partnerContact.trim();
    this.#links = links.map((link) => (link instanceof KnowledgeLink ? link : new KnowledgeLink(link)));
    this.#tags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    this.#freshness = freshness instanceof Freshness ? freshness : new Freshness(freshness || {});
    this.#status = status instanceof KnowledgeStatus ? status : new KnowledgeStatus(status);
    this.#metadata = metadata instanceof NodeMetadata ? metadata : new NodeMetadata(metadata || {});
  }

  #validateCategoryType(categoryType) {
    if (typeof categoryType !== 'string' || categoryType.trim().length === 0) {
      throw new ValidationError('Entry must belong to a category', 'categoryType');
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
    if (typeof description !== 'string') {
      throw new ValidationError('Description must be a string', 'description');
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(
        `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
        'description'
      );
    }
  }

  #validatePartnerName(partnerName) {
    if (typeof partnerName !== 'string') {
      throw new ValidationError('Partner name must be a string', 'partnerName');
    }

    if (partnerName.length > MAX_PARTNER_NAME_LENGTH) {
      throw new ValidationError(
        `Partner name must not exceed ${MAX_PARTNER_NAME_LENGTH} characters`,
        'partnerName'
      );
    }
  }

  #validatePartnerContact(partnerContact) {
    if (typeof partnerContact !== 'string') {
      throw new ValidationError('Partner contact must be a string', 'partnerContact');
    }

    if (partnerContact.length > MAX_PARTNER_CONTACT_LENGTH) {
      throw new ValidationError(
        `Partner contact must not exceed ${MAX_PARTNER_CONTACT_LENGTH} characters`,
        'partnerContact'
      );
    }
  }

  #validateLinks(links) {
    if (!Array.isArray(links)) {
      throw new ValidationError('Links must be an array', 'links');
    }

    if (links.length > MAX_LINKS) {
      throw new ValidationError(`An entry must not exceed ${MAX_LINKS} links`, 'links');
    }
  }

  #validateTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array', 'tags');
    }

    if (tags.length > MAX_TAGS) {
      throw new ValidationError(`An entry must not exceed ${MAX_TAGS} tags`, 'tags');
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

  get description() {
    return this.#description;
  }

  get partnerName() {
    return this.#partnerName;
  }

  get partnerContact() {
    return this.#partnerContact;
  }

  get links() {
    return [...this.#links];
  }

  get tags() {
    return [...this.#tags];
  }

  get freshness() {
    return this.#freshness;
  }

  get status() {
    return this.#status;
  }

  get metadata() {
    return this.#metadata;
  }

  get isActive() {
    return this.#status.isActive;
  }

  get isInactive() {
    return this.#status.isInactive;
  }

  updateContent({ title, description, partnerName, partnerContact, categoryType }) {
    if (title !== undefined) {
      this.#validateTitle(title);
      this.#title = title.trim();
    }

    if (description !== undefined) {
      this.#validateDescription(description);
      this.#description = description;
    }

    if (partnerName !== undefined) {
      this.#validatePartnerName(partnerName);
      this.#partnerName = partnerName.trim();
    }

    if (partnerContact !== undefined) {
      this.#validatePartnerContact(partnerContact);
      this.#partnerContact = partnerContact.trim();
    }

    if (categoryType !== undefined) {
      this.#validateCategoryType(categoryType);
      this.#categoryType = categoryType;
    }

    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateLinks(links) {
    this.#validateLinks(links);
    this.#links = links.map((link) => (link instanceof KnowledgeLink ? link : new KnowledgeLink(link)));
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateTags(tags) {
    this.#validateTags(tags);
    this.#tags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateReviewInterval(reviewIntervalDays) {
    this.#freshness = this.#freshness.withReviewIntervalDays(reviewIntervalDays);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  updateLastReviewedAt(lastReviewedAt) {
    this.#freshness = this.#freshness.withLastReviewedAt(lastReviewedAt);
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  markReviewed() {
    this.#freshness = this.#freshness.markReviewed();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  activate() {
    this.#status = this.#status.activate();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  deactivate() {
    this.#status = this.#status.deactivate();
    this.#metadata = this.#metadata.withUpdatedTimestamp();
    return this;
  }

  toJSON() {
    const { lastReviewedAt, reviewIntervalDays } = this.#freshness.toJSON();

    return {
      entityType: 'knowledge_entry',
      id: this.#id,
      categoryType: this.#categoryType,
      title: this.#title,
      description: this.#description,
      partnerName: this.#partnerName,
      partnerContact: this.#partnerContact,
      links: this.#links.map((link) => link.toJSON()),
      tags: [...this.#tags],
      lastReviewedAt,
      reviewIntervalDays,
      status: this.#status.toJSON(),
      createdAt: this.#metadata.createdAt,
      updatedAt: this.#metadata.updatedAt,
    };
  }

  static fromJSON(json) {
    return new KnowledgeEntry({
      id: json.id,
      categoryType: json.categoryType,
      title: json.title,
      description: json.description ?? '',
      partnerName: json.partnerName ?? '',
      partnerContact: json.partnerContact ?? '',
      links: json.links ?? [],
      tags: json.tags ?? [],
      freshness: {
        lastReviewedAt: json.lastReviewedAt,
        reviewIntervalDays: json.reviewIntervalDays,
      },
      status: json.status ?? KNOWLEDGE_STATUS_TYPES.ACTIVE,
      metadata: {
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      },
    });
  }

  static create(categoryType, title) {
    return new KnowledgeEntry({ categoryType, title });
  }
}
