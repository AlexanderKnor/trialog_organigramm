/**
 * Entity: Campaign
 * A time-boxed marketing push (e.g. "Sommeroffensive"). Whether it is running
 * is derived from its date range — there is no manual "active" flag to forget
 * to flip.
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';

const MAX_TITLE_LENGTH = 140;
const MAX_FOCUS_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isValidHttpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export class Campaign {
  #id;
  #title;
  #focus;
  #description;
  #startDate;
  #endDate;
  #ctaLabel;
  #ctaUrl;
  #createdAt;
  #updatedAt;

  constructor({
    id = null,
    title,
    focus = '',
    description = '',
    startDate,
    endDate,
    ctaLabel = '',
    ctaUrl = '',
    createdAt = null,
    updatedAt = null,
  }) {
    this.#validateTitle(title);
    this.#validateFocus(focus);
    this.#validateDescription(description);
    this.#validateDates(startDate, endDate);
    this.#validateCta(ctaLabel, ctaUrl);

    const now = new Date().toISOString();

    this.#id = id || generateUUID();
    this.#title = title.trim();
    this.#focus = focus.trim();
    this.#description = description.trim();
    this.#startDate = startDate;
    this.#endDate = endDate;
    this.#ctaLabel = ctaLabel.trim();
    this.#ctaUrl = ctaUrl.trim();
    this.#createdAt = createdAt || now;
    this.#updatedAt = updatedAt || now;
  }

  #validateTitle(title) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Title must be a non-empty string', 'title');
    }

    if (title.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Title must not exceed ${MAX_TITLE_LENGTH} characters`, 'title');
    }
  }

  #validateFocus(focus) {
    if (typeof focus !== 'string' || focus.length > MAX_FOCUS_LENGTH) {
      throw new ValidationError(
        `Focus must be a string of at most ${MAX_FOCUS_LENGTH} characters`,
        'focus'
      );
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

  #validateDates(startDate, endDate) {
    if (typeof startDate !== 'string' || !ISO_DATE.test(startDate)) {
      throw new ValidationError('Start date must be an ISO date (YYYY-MM-DD)', 'startDate');
    }

    if (typeof endDate !== 'string' || !ISO_DATE.test(endDate)) {
      throw new ValidationError('End date must be an ISO date (YYYY-MM-DD)', 'endDate');
    }

    if (endDate < startDate) {
      throw new ValidationError('End date must not be before start date', 'endDate');
    }
  }

  #validateCta(ctaLabel, ctaUrl) {
    if (typeof ctaLabel !== 'string' || typeof ctaUrl !== 'string') {
      throw new ValidationError('CTA label and URL must be strings', 'ctaUrl');
    }

    if (ctaUrl.trim().length > 0) {
      if (ctaUrl.length > MAX_URL_LENGTH || !isValidHttpUrl(ctaUrl.trim())) {
        throw new ValidationError('CTA URL must be a valid http(s) URL', 'ctaUrl');
      }
    }
  }

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  get focus() {
    return this.#focus;
  }

  get description() {
    return this.#description;
  }

  get startDate() {
    return this.#startDate;
  }

  get endDate() {
    return this.#endDate;
  }

  get ctaLabel() {
    return this.#ctaLabel;
  }

  get ctaUrl() {
    return this.#ctaUrl;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  /**
   * Date-range checks compare ISO date strings lexicographically — no Date
   * parsing, so no UTC-vs-local midnight drift. `onDate` is YYYY-MM-DD.
   */
  isActiveOn(onDate) {
    return this.#startDate <= onDate && onDate <= this.#endDate;
  }

  isUpcomingOn(onDate) {
    return this.#startDate > onDate;
  }

  isEndedOn(onDate) {
    return this.#endDate < onDate;
  }

  /** Whole days from onDate to the end, inclusive of the end day; 0 when over. */
  remainingDaysOn(onDate) {
    if (this.isEndedOn(onDate)) {
      return 0;
    }

    const end = new Date(`${this.#endDate}T00:00:00Z`);
    const from = new Date(`${onDate}T00:00:00Z`);

    return Math.round((end - from) / 86400000);
  }

  withUpdates(updates) {
    return new Campaign({
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
      title: this.#title,
      focus: this.#focus,
      description: this.#description,
      startDate: this.#startDate,
      endDate: this.#endDate,
      ctaLabel: this.#ctaLabel,
      ctaUrl: this.#ctaUrl,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }

  static fromJSON(data) {
    return new Campaign(data || {});
  }
}
