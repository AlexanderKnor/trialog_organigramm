/**
 * Molecule: WIFOProgressIndicator
 * Shows progress of file parsing, validation, or import
 */

import { createElement } from '../../../../../core/utils/index.js';

export class WIFOProgressIndicator {
  #element;
  #progressBar;
  #progressText;
  #messageText;
  #statusText;

  constructor() {
    this.#element = this.#render();
  }

  #render() {
    const container = createElement('div', { className: 'wifo-progress-container' });

    // Status text
    this.#statusText = createElement('div', { className: 'wifo-progress-status' }, [
      'Wird verarbeitet...',
    ]);

    // Progress bar container
    const progressBarContainer = createElement('div', { className: 'wifo-progress-bar-container' });

    this.#progressBar = createElement('div', { className: 'wifo-progress-bar' });
    progressBarContainer.appendChild(this.#progressBar);

    // Progress text (percentage)
    this.#progressText = createElement('span', { className: 'wifo-progress-text' }, ['0%']);

    // Message text
    this.#messageText = createElement('div', { className: 'wifo-progress-message' });

    container.appendChild(this.#statusText);
    container.appendChild(progressBarContainer);
    container.appendChild(this.#progressText);
    container.appendChild(this.#messageText);

    return container;
  }

  update(progress, message = '', status = null) {
    const percent = Math.min(100, Math.max(0, progress));

    this.#progressBar.style.width = `${percent}%`;
    this.#progressText.textContent = `${Math.round(percent)}%`;

    if (message) {
      this.#messageText.textContent = message;
    }

    if (status) {
      this.#statusText.textContent = status;
    }
  }

  setStatus(status) {
    this.#statusText.textContent = status;
  }

  setSuccess() {
    this.#element.classList.add('wifo-progress-success');
    this.#progressBar.style.width = '100%';
  }

  setError(message) {
    this.#element.classList.add('wifo-progress-error');
    this.#messageText.textContent = message;
  }

  reset() {
    this.#element.classList.remove('wifo-progress-success', 'wifo-progress-error');
    this.#progressBar.style.width = '0%';
    this.#progressText.textContent = '0%';
    this.#messageText.textContent = '';
    this.#statusText.textContent = 'Wird verarbeitet...';
  }

  show() {
    this.#element.style.display = 'block';
  }

  hide() {
    this.#element.style.display = 'none';
  }

  get element() {
    return this.#element;
  }
}
