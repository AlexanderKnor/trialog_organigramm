/**
 * Value Object: Freshness
 * Tracks when an admin last confirmed an entry still holds, and how long that
 * confirmation is good for.
 *
 * Deliberately NOT derived from the entity's updatedAt: freshness means "someone
 * checked this", not "a byte changed". Fixing a typo must not reset the clock.
 * updatedAt is also unusable here for a second reason — the Firestore data source
 * overwrites it with a serverTimestamp on write, so it comes back as a Timestamp
 * object rather than the ISO string the domain contract promises.
 */

import { ValidationError } from '../../../../core/errors/index.js';
import { getCurrentTimestamp } from '../../../../core/utils/index.js';

export const FRESHNESS_LEVELS = {
  CURRENT: 'current',
  DUE: 'due',
  STALE: 'stale',
};

export const DEFAULT_REVIEW_INTERVAL_DAYS = 180;

const MIN_REVIEW_INTERVAL_DAYS = 1;
const MAX_REVIEW_INTERVAL_DAYS = 3650;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Past this multiple of the interval an entry is not merely due but stale. */
const STALE_INTERVAL_FACTOR = 1.5;

export class Freshness {
  #lastReviewedAt;
  #reviewIntervalDays;

  constructor({ lastReviewedAt = null, reviewIntervalDays = DEFAULT_REVIEW_INTERVAL_DAYS } = {}) {
    const reviewedAt = lastReviewedAt || getCurrentTimestamp();

    this.#validateLastReviewedAt(reviewedAt);
    this.#validateReviewIntervalDays(reviewIntervalDays);

    this.#lastReviewedAt = reviewedAt;
    this.#reviewIntervalDays = reviewIntervalDays;

    Object.freeze(this);
  }

  #validateLastReviewedAt(lastReviewedAt) {
    if (typeof lastReviewedAt !== 'string' || Number.isNaN(Date.parse(lastReviewedAt))) {
      throw new ValidationError(
        'Last reviewed date must be an ISO date string',
        'lastReviewedAt'
      );
    }
  }

  #validateReviewIntervalDays(reviewIntervalDays) {
    if (!Number.isFinite(reviewIntervalDays)) {
      throw new ValidationError('Review interval must be a number', 'reviewIntervalDays');
    }

    if (reviewIntervalDays < MIN_REVIEW_INTERVAL_DAYS || reviewIntervalDays > MAX_REVIEW_INTERVAL_DAYS) {
      throw new ValidationError(
        `Review interval must be between ${MIN_REVIEW_INTERVAL_DAYS} and ${MAX_REVIEW_INTERVAL_DAYS} days`,
        'reviewIntervalDays'
      );
    }
  }

  get lastReviewedAt() {
    return this.#lastReviewedAt;
  }

  get reviewIntervalDays() {
    return this.#reviewIntervalDays;
  }

  /**
   * Computed per call rather than at construction: freshness is a function of
   * now, so a panel left open overnight must not keep showing yesterday's verdict.
   */
  get daysSinceReview() {
    const elapsed = Date.now() - Date.parse(this.#lastReviewedAt);
    return Math.floor(elapsed / MS_PER_DAY);
  }

  get level() {
    const age = this.daysSinceReview;

    if (age < this.#reviewIntervalDays) {
      return FRESHNESS_LEVELS.CURRENT;
    }

    if (age < this.#reviewIntervalDays * STALE_INTERVAL_FACTOR) {
      return FRESHNESS_LEVELS.DUE;
    }

    return FRESHNESS_LEVELS.STALE;
  }

  get isCurrent() {
    return this.level === FRESHNESS_LEVELS.CURRENT;
  }

  get isStale() {
    return this.level === FRESHNESS_LEVELS.STALE;
  }

  markReviewed() {
    return new Freshness({
      lastReviewedAt: getCurrentTimestamp(),
      reviewIntervalDays: this.#reviewIntervalDays,
    });
  }

  withReviewIntervalDays(reviewIntervalDays) {
    return new Freshness({
      lastReviewedAt: this.#lastReviewedAt,
      reviewIntervalDays,
    });
  }

  withLastReviewedAt(lastReviewedAt) {
    return new Freshness({
      lastReviewedAt,
      reviewIntervalDays: this.#reviewIntervalDays,
    });
  }

  /**
   * Only the raw inputs are persisted. Never store `level` — it is time-dependent,
   * so a stored copy would start lying the moment it is written.
   */
  toJSON() {
    return {
      lastReviewedAt: this.#lastReviewedAt,
      reviewIntervalDays: this.#reviewIntervalDays,
    };
  }

  static fromJSON(json) {
    return new Freshness(json || {});
  }

  equals(other) {
    return (
      other instanceof Freshness &&
      this.#lastReviewedAt === other.lastReviewedAt &&
      this.#reviewIntervalDays === other.reviewIntervalDays
    );
  }
}
