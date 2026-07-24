/**
 * Molecule: FreshnessBadge
 * Shows whether an entry is still considered accurate.
 *
 * Never colour alone: each state carries an icon and a word, so it survives
 * colour blindness, greyscale printing and a dark room. The aria-label names the
 * actual date, which the visual badge only implies.
 */

import { createElement, formatDate } from '../../../../../core/utils/index.js';
import { Icon } from '../../../../hierarchy-tracking/presentation/components/atoms/Icon.js';
import { FRESHNESS_LEVELS } from '../../../domain/value-objects/Freshness.js';

const LEVEL_PRESENTATION = Object.freeze({
  [FRESHNESS_LEVELS.CURRENT]: { label: 'Aktuell', icon: 'checkCircle', modifier: 'current' },
  [FRESHNESS_LEVELS.DUE]: { label: 'Prüfung fällig', icon: 'clock', modifier: 'due' },
  [FRESHNESS_LEVELS.STALE]: { label: 'Veraltet', icon: 'alertTriangle', modifier: 'stale' },
});

export class FreshnessBadge {
  #element;

  constructor({ freshness }) {
    this.#element = this.#render(freshness);
  }

  #render(freshness) {
    const level = freshness.level;
    const presentation = LEVEL_PRESENTATION[level] || LEVEL_PRESENTATION[FRESHNESS_LEVELS.CURRENT];
    const reviewedOn = formatDate(freshness.lastReviewedAt);

    return createElement(
      'span',
      {
        className: `kb-freshness kb-freshness-${presentation.modifier}`,
        'aria-label': `${presentation.label}. Zuletzt geprüft am ${reviewedOn}`,
        title: `Zuletzt geprüft am ${reviewedOn}`,
      },
      [
        new Icon({ name: presentation.icon, size: 14 }).element,
        createElement('span', { className: 'kb-freshness-label' }, [presentation.label]),
      ]
    );
  }

  get element() {
    return this.#element;
  }
}
