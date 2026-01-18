/**
 * Molecule: WIFOImportOverlay
 * Elegant loading overlay shown during import process
 */

import { createElement } from '../../../../../core/utils/index.js';

export class WIFOImportOverlay {
  #element;
  #progressCircle;
  #progressValue;
  #importedCount;
  #failedCount;
  #remainingCount;
  #statusText;
  #detailText;
  #circleCircumference = 439.82; // 2 * PI * 70

  constructor() {
    this.#element = this.#render();
  }

  #render() {
    const overlay = createElement('div', { className: 'wifo-import-overlay' });

    // Animated Spinner
    const spinner = this.#createSpinner();
    overlay.appendChild(spinner);

    // Title
    const title = createElement('h3', { className: 'wifo-import-title' }, [
      'Daten werden importiert',
    ]);
    overlay.appendChild(title);

    // Status text
    this.#statusText = createElement('p', { className: 'wifo-import-status' }, [
      'Bitte warten...',
    ]);
    overlay.appendChild(this.#statusText);

    // Circular Progress
    const progressContainer = this.#createCircularProgress();
    overlay.appendChild(progressContainer);

    // Counter stats
    const counters = this.#createCounters();
    overlay.appendChild(counters);

    // Detail text
    this.#detailText = createElement('p', { className: 'wifo-import-detail' }, [
      '',
    ]);
    overlay.appendChild(this.#detailText);

    return overlay;
  }

  #createSpinner() {
    const spinner = createElement('div', { className: 'wifo-import-spinner' });

    // Three rotating rings
    for (let i = 0; i < 3; i++) {
      spinner.appendChild(createElement('div', { className: 'wifo-import-spinner-ring' }));
    }

    // Center icon (database icon)
    const iconWrapper = createElement('div', { className: 'wifo-import-spinner-icon' });
    iconWrapper.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    `;
    spinner.appendChild(iconWrapper);

    return spinner;
  }

  #createCircularProgress() {
    const container = createElement('div', { className: 'wifo-import-progress-container' });

    // SVG Progress Circle
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wifo-import-progress-circle');
    svg.setAttribute('viewBox', '0 0 160 160');

    // Gradient definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'wifo-progress-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#3b82f6');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#60a5fa');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('class', 'wifo-import-progress-bg');
    bgCircle.setAttribute('cx', '80');
    bgCircle.setAttribute('cy', '80');
    bgCircle.setAttribute('r', '70');
    svg.appendChild(bgCircle);

    // Progress circle
    this.#progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.#progressCircle.setAttribute('class', 'wifo-import-progress-bar');
    this.#progressCircle.setAttribute('cx', '80');
    this.#progressCircle.setAttribute('cy', '80');
    this.#progressCircle.setAttribute('r', '70');
    svg.appendChild(this.#progressCircle);

    container.appendChild(svg);

    // Center content
    const content = createElement('div', { className: 'wifo-import-progress-content' });
    this.#progressValue = createElement('div', { className: 'wifo-import-progress-value' }, ['0%']);
    const label = createElement('div', { className: 'wifo-import-progress-label' }, ['Fortschritt']);
    content.appendChild(this.#progressValue);
    content.appendChild(label);
    container.appendChild(content);

    return container;
  }

  #createCounters() {
    const counters = createElement('div', { className: 'wifo-import-counters' });

    // Imported counter
    const importedCounter = createElement('div', { className: 'wifo-import-counter' });
    this.#importedCount = createElement('div', {
      className: 'wifo-import-counter-value wifo-import-counter-value-success wifo-import-number-animate',
    }, ['0']);
    const importedLabel = createElement('div', { className: 'wifo-import-counter-label' }, ['Importiert']);
    importedCounter.appendChild(this.#importedCount);
    importedCounter.appendChild(importedLabel);
    counters.appendChild(importedCounter);

    // Failed counter
    const failedCounter = createElement('div', { className: 'wifo-import-counter' });
    this.#failedCount = createElement('div', {
      className: 'wifo-import-counter-value wifo-import-counter-value-failed wifo-import-number-animate',
    }, ['0']);
    const failedLabel = createElement('div', { className: 'wifo-import-counter-label' }, ['Fehlerhaft']);
    failedCounter.appendChild(this.#failedCount);
    failedCounter.appendChild(failedLabel);
    counters.appendChild(failedCounter);

    // Remaining counter
    const remainingCounter = createElement('div', { className: 'wifo-import-counter' });
    this.#remainingCount = createElement('div', {
      className: 'wifo-import-counter-value wifo-import-counter-value-remaining wifo-import-number-animate',
    }, ['0']);
    const remainingLabel = createElement('div', { className: 'wifo-import-counter-label' }, ['Verbleibend']);
    remainingCounter.appendChild(this.#remainingCount);
    remainingCounter.appendChild(remainingLabel);
    counters.appendChild(remainingCounter);

    return counters;
  }

  /**
   * Update progress display
   * @param {Object} stats - Import statistics
   * @param {number} stats.progress - Progress percentage (0-100)
   * @param {number} stats.imported - Number of imported entries
   * @param {number} stats.failed - Number of failed entries
   * @param {number} stats.remaining - Number of remaining entries
   * @param {number} stats.total - Total number of entries
   * @param {string} [stats.message] - Optional status message
   */
  update({ progress, imported, failed, remaining, total, message }) {
    // Update circular progress
    const offset = this.#circleCircumference - (progress / 100) * this.#circleCircumference;
    this.#progressCircle.style.strokeDashoffset = offset;
    this.#progressValue.textContent = `${Math.round(progress)}%`;

    // Update counters with animation
    this.#animateCounter(this.#importedCount, imported);
    this.#animateCounter(this.#failedCount, failed);
    this.#animateCounter(this.#remainingCount, remaining);

    // Update status text
    if (message) {
      this.#statusText.textContent = message;
    }

    // Update detail text
    this.#detailText.textContent = `${imported + failed} von ${total} Einträgen verarbeitet`;
  }

  #animateCounter(element, newValue) {
    const currentValue = parseInt(element.textContent, 10);
    if (currentValue !== newValue) {
      element.textContent = newValue.toString();
      element.classList.add('wifo-number-change');
      setTimeout(() => {
        element.classList.remove('wifo-number-change');
      }, 300);
    }
  }

  show() {
    this.#element.classList.add('wifo-import-overlay-visible');
  }

  hide() {
    this.#element.classList.remove('wifo-import-overlay-visible');
  }

  reset() {
    this.#progressCircle.style.strokeDashoffset = this.#circleCircumference;
    this.#progressValue.textContent = '0%';
    this.#importedCount.textContent = '0';
    this.#failedCount.textContent = '0';
    this.#remainingCount.textContent = '0';
    this.#statusText.textContent = 'Bitte warten...';
    this.#detailText.textContent = '';
  }

  get element() {
    return this.#element;
  }
}
