/**
 * Molecule: WIFOFileUpload
 * File upload component for WIFO import
 */

import { createElement } from '../../../../../core/utils/index.js';

export class WIFOFileUpload {
  #element;
  #onFileSelect;
  #fileInput;
  #dropZone;
  #isDisabled;

  constructor({ onFileSelect, isDisabled = false }) {
    this.#onFileSelect = onFileSelect;
    this.#isDisabled = isDisabled;
    this.#element = this.#render();
    this.#setupEventListeners();
  }

  #render() {
    const container = createElement('div', { className: 'wifo-upload-container' });

    // File input (hidden)
    this.#fileInput = createElement('input', {
      type: 'file',
      accept: '.xlsx,.xls,.csv',
      className: 'wifo-upload-input',
      id: 'wifo-file-input',
    });

    // Drop zone
    this.#dropZone = createElement('div', {
      className: `wifo-upload-dropzone ${this.#isDisabled ? 'wifo-upload-dropzone-disabled' : ''}`,
    }, [
      createElement('div', { className: 'wifo-upload-icon' }, [
        this.#createUploadIcon(),
      ]),
      createElement('div', { className: 'wifo-upload-text' }, [
        createElement('span', { className: 'wifo-upload-title' }, [
          'WIFO-Datei hochladen',
        ]),
        createElement('span', { className: 'wifo-upload-subtitle' }, [
          'Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen',
        ]),
        createElement('span', { className: 'wifo-upload-formats' }, [
          'Unterstützte Formate: .xlsx, .xls, .csv',
        ]),
      ]),
    ]);

    container.appendChild(this.#fileInput);
    container.appendChild(this.#dropZone);

    return container;
  }

  #setupEventListeners() {
    // Click to open file dialog
    this.#dropZone.addEventListener('click', () => {
      if (!this.#isDisabled) {
        this.#fileInput.click();
      }
    });

    // File selected
    this.#fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && this.#onFileSelect) {
        this.#onFileSelect(file);
      }
      // Reset input for re-selection of same file
      this.#fileInput.value = '';
    });

    // Drag and drop
    this.#dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.#isDisabled) {
        this.#dropZone.classList.add('wifo-upload-dropzone-active');
      }
    });

    this.#dropZone.addEventListener('dragleave', () => {
      this.#dropZone.classList.remove('wifo-upload-dropzone-active');
    });

    this.#dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.#dropZone.classList.remove('wifo-upload-dropzone-active');

      if (this.#isDisabled) return;

      const file = e.dataTransfer?.files?.[0];
      if (file && this.#onFileSelect) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['xlsx', 'xls', 'csv'].includes(ext)) {
          this.#onFileSelect(file);
        }
      }
    });
  }

  #createUploadIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('class', 'wifo-upload-svg-icon');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return svg;
  }

  setDisabled(disabled) {
    this.#isDisabled = disabled;
    if (disabled) {
      this.#dropZone.classList.add('wifo-upload-dropzone-disabled');
    } else {
      this.#dropZone.classList.remove('wifo-upload-dropzone-disabled');
    }
  }

  get element() {
    return this.#element;
  }
}
