/**
 * Molecule: WIFOStatisticsSummary
 * Displays import batch statistics
 */

import { createElement } from '../../../../../core/utils/index.js';

export class WIFOStatisticsSummary {
  #element;
  #cards;

  constructor() {
    this.#cards = {};
    this.#element = this.#render();
  }

  #render() {
    const container = createElement('div', { className: 'wifo-stats-container' });

    // Create stat cards
    this.#cards.total = this.#createStatCard('Gesamt', '0', 'total');
    this.#cards.valid = this.#createStatCard('Gültig', '0', 'valid');
    this.#cards.warning = this.#createStatCard('Warnung', '0', 'warning');
    this.#cards.invalid = this.#createStatCard('Ungültig', '0', 'invalid');
    this.#cards.imported = this.#createStatCard('Importiert', '0', 'imported');

    container.appendChild(this.#cards.total.element);
    container.appendChild(this.#cards.valid.element);
    container.appendChild(this.#cards.warning.element);
    container.appendChild(this.#cards.invalid.element);
    container.appendChild(this.#cards.imported.element);

    return container;
  }

  #createStatCard(label, value, type) {
    const card = createElement('div', {
      className: `wifo-stat-card wifo-stat-card-${type}`,
    });

    const valueElement = createElement('span', { className: 'wifo-stat-value' }, [value]);
    const labelElement = createElement('span', { className: 'wifo-stat-label' }, [label]);

    card.appendChild(valueElement);
    card.appendChild(labelElement);

    return { element: card, valueElement };
  }

  update(stats) {
    if (!stats) return;

    this.#cards.total.valueElement.textContent = stats.total?.toString() || '0';
    this.#cards.valid.valueElement.textContent = stats.valid?.toString() || '0';
    this.#cards.warning.valueElement.textContent = stats.warnings?.toString() || '0';
    this.#cards.invalid.valueElement.textContent = stats.invalid?.toString() || '0';
    this.#cards.imported.valueElement.textContent = stats.imported?.toString() || '0';

    // Update visual emphasis based on values
    this.#updateCardState('valid', stats.valid > 0);
    this.#updateCardState('warning', stats.warnings > 0);
    this.#updateCardState('invalid', stats.invalid > 0);
    this.#updateCardState('imported', stats.imported > 0);
  }

  #updateCardState(type, hasValue) {
    const card = this.#cards[type];
    if (hasValue) {
      card.element.classList.add('wifo-stat-card-active');
    } else {
      card.element.classList.remove('wifo-stat-card-active');
    }
  }

  get element() {
    return this.#element;
  }
}
