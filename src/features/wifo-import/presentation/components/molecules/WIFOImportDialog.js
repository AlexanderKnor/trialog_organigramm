/**
 * Molecule: WIFOImportDialog
 * Main dialog for WIFO file import
 */

import { createElement } from '../../../../../core/utils/index.js';
import { WIFOFileUpload } from './WIFOFileUpload.js';
import { WIFOProgressIndicator } from './WIFOProgressIndicator.js';
import { WIFOStatisticsSummary } from './WIFOStatisticsSummary.js';
import { WIFOImportOverlay } from './WIFOImportOverlay.js';
import { WIFOPreviewTable } from '../organisms/WIFOPreviewTable.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';

export class WIFOImportDialog {
  #element;
  #overlay;
  #importService;
  #state;
  #onImportComplete;

  // Sub-components
  #fileUpload;
  #progressIndicator;
  #statisticsSummary;
  #previewTable;
  #importOverlay;
  #validateButton;
  #importButton;
  #cancelButton;
  #closeButton;

  // Step containers
  #uploadStep;
  #validationStep;
  #previewStep;
  #resultStep;

  #currentStep = 'upload';
  #unsubscribe = null;

  constructor({ importService, state, onImportComplete = null }) {
    this.#importService = importService;
    this.#state = state;
    this.#onImportComplete = onImportComplete;
    this.#element = this.#render();
    this.#subscribeToState();
  }

  #render() {
    // Overlay
    this.#overlay = createElement('div', { className: 'wifo-dialog-overlay' });

    // Dialog
    const dialog = createElement('div', { className: 'wifo-dialog' });

    // Header
    const header = createElement('div', { className: 'wifo-dialog-header' }, [
      createElement('h2', { className: 'wifo-dialog-title' }, ['WIFO-Import']),
      this.#closeButton = new Button({
        label: '×',
        variant: 'ghost',
        className: 'wifo-dialog-close',
        onClick: () => this.hide(),
      }),
    ]);
    dialog.appendChild(header.cloneNode ? header : header);

    // Body with steps
    const body = createElement('div', { className: 'wifo-dialog-body' });

    // Step 1: Upload
    this.#uploadStep = this.#createUploadStep();
    body.appendChild(this.#uploadStep);

    // Step 2: Validation/Progress
    this.#validationStep = this.#createValidationStep();
    body.appendChild(this.#validationStep);

    // Step 3: Preview
    this.#previewStep = this.#createPreviewStep();
    body.appendChild(this.#previewStep);

    // Step 4: Result
    this.#resultStep = this.#createResultStep();
    body.appendChild(this.#resultStep);

    dialog.appendChild(body);

    // Footer
    const footer = this.#createFooter();
    dialog.appendChild(footer);

    this.#overlay.appendChild(dialog);
    this.#showStep('upload');

    return this.#overlay;
  }

  #createUploadStep() {
    const step = createElement('div', {
      className: 'wifo-dialog-step wifo-step-upload',
    });

    this.#fileUpload = new WIFOFileUpload({
      onFileSelect: (file) => this.#handleFileSelect(file),
    });

    step.appendChild(this.#fileUpload.element);

    // Info text
    const info = createElement('div', { className: 'wifo-upload-info' }, [
      createElement('p', {}, [
        'Laden Sie eine WIFO-Courtageabrechnung hoch. Die Datei wird automatisch validiert und Sie können vor dem Import eine Vorschau sehen.',
      ]),
    ]);
    step.appendChild(info);

    return step;
  }

  #createValidationStep() {
    const step = createElement('div', {
      className: 'wifo-dialog-step wifo-step-validation',
      style: 'display: none;',
    });

    this.#progressIndicator = new WIFOProgressIndicator();
    step.appendChild(this.#progressIndicator.element);

    return step;
  }

  #createPreviewStep() {
    const step = createElement('div', {
      className: 'wifo-dialog-step wifo-step-preview',
      style: 'display: none; position: relative;',
    });

    // Statistics summary
    this.#statisticsSummary = new WIFOStatisticsSummary();
    step.appendChild(this.#statisticsSummary.element);

    // Filter bar
    const filterBar = this.#createFilterBar();
    step.appendChild(filterBar);

    // Preview table
    this.#previewTable = new WIFOPreviewTable({
      onRecordClick: (record) => this.#handleRecordClick(record),
      onRecordSelect: (recordId) => this.#state.toggleRecordSelection(recordId),
    });
    step.appendChild(this.#previewTable.element);

    // Import overlay (elegant loading animation)
    this.#importOverlay = new WIFOImportOverlay();
    step.appendChild(this.#importOverlay.element);

    return step;
  }

  #createFilterBar() {
    const filterBar = createElement('div', { className: 'wifo-filter-bar' });

    // Filter buttons
    const filters = [
      { value: 'all', label: 'Alle' },
      { value: 'valid', label: 'Gültig' },
      { value: 'warning', label: 'Warnungen' },
      { value: 'invalid', label: 'Ungültig' },
      { value: 'importable', label: 'Importierbar' },
    ];

    const filterGroup = createElement('div', { className: 'wifo-filter-group' });

    for (const filter of filters) {
      const btn = createElement('button', {
        className: `wifo-filter-btn ${filter.value === 'all' ? 'wifo-filter-btn-active' : ''}`,
        'data-filter': filter.value,
      }, [filter.label]);

      btn.addEventListener('click', () => {
        filterGroup.querySelectorAll('.wifo-filter-btn').forEach((b) => {
          b.classList.remove('wifo-filter-btn-active');
        });
        btn.classList.add('wifo-filter-btn-active');
        this.#state.setFilterStatus(filter.value);
      });

      filterGroup.appendChild(btn);
    }

    filterBar.appendChild(filterGroup);

    // Search input
    const searchInput = createElement('input', {
      type: 'text',
      placeholder: 'Suchen...',
      className: 'wifo-filter-search',
    });
    searchInput.addEventListener('input', (e) => {
      this.#state.setSearchQuery(e.target.value);
    });
    filterBar.appendChild(searchInput);

    return filterBar;
  }

  #createResultStep() {
    const step = createElement('div', {
      className: 'wifo-dialog-step wifo-step-result',
      style: 'display: none;',
    });

    return step;
  }

  #createFooter() {
    const footer = createElement('div', { className: 'wifo-dialog-footer' });

    this.#cancelButton = new Button({
      label: 'Abbrechen',
      variant: 'secondary',
      onClick: () => this.hide(),
    });

    this.#validateButton = new Button({
      label: 'Validieren',
      variant: 'primary',
      onClick: () => this.#handleValidate(),
    });
    this.#validateButton.element.style.display = 'none';

    this.#importButton = new Button({
      label: 'Importieren',
      variant: 'primary',
      onClick: () => this.#handleImport(),
    });
    this.#importButton.element.style.display = 'none';

    footer.appendChild(this.#cancelButton.element);
    footer.appendChild(this.#validateButton.element);
    footer.appendChild(this.#importButton.element);

    return footer;
  }

  #subscribeToState() {
    this.#unsubscribe = this.#state.subscribe(() => {
      this.#updateUI();
    });
  }

  #updateUI() {
    // Skip table updates during import - overlay handles progress display
    if (this.#state.isImporting) {
      return;
    }

    // Update table with filtered records
    if (this.#state.currentBatch) {
      this.#previewTable.setRecords(
        this.#state.filteredRecords,
        this.#state.selectedRecordIds
      );

      // Update statistics
      const stats = this.#importService.getStatistics(this.#state.currentBatch);
      this.#statisticsSummary.update(stats);

      // Update import button state
      const canImport = this.#state.currentBatch.canImport && !this.#state.isProcessing;
      this.#importButton.setDisabled(!canImport);
    }

    // Update progress indicator
    if (this.#state.isUploading) {
      this.#progressIndicator.update(
        this.#state.uploadProgress,
        this.#state.progressMessage,
        'Datei wird hochgeladen...'
      );
    } else if (this.#state.isValidating) {
      this.#progressIndicator.update(
        this.#state.validationProgress,
        this.#state.progressMessage,
        'Daten werden validiert...'
      );
    }
  }

  #showStep(step) {
    this.#currentStep = step;

    // Hide all steps
    this.#uploadStep.style.display = 'none';
    this.#validationStep.style.display = 'none';
    this.#previewStep.style.display = 'none';
    this.#resultStep.style.display = 'none';

    // Hide all footer buttons
    this.#validateButton.element.style.display = 'none';
    this.#importButton.element.style.display = 'none';

    // Show current step
    switch (step) {
      case 'upload':
        this.#uploadStep.style.display = 'block';
        break;

      case 'validation':
        this.#validationStep.style.display = 'block';
        break;

      case 'preview':
        this.#previewStep.style.display = 'block';
        this.#importButton.element.style.display = 'inline-flex';
        break;

      case 'result':
        this.#resultStep.style.display = 'block';
        this.#cancelButton.setLabel('Schließen');
        break;
    }
  }

  async #handleFileSelect(file) {
    try {
      this.#state.clearError();
      this.#showStep('validation');

      // Parse file
      this.#state.setUploading(true, 0, 'Datei wird gelesen...');

      const batch = await this.#importService.parseFile(
        file,
        null, // userId will be added by service
        (progress, total, message) => {
          this.#state.setUploading(true, (progress / total) * 50, message);
        }
      );

      this.#state.setCurrentBatch(batch);
      this.#state.setUploading(false);

      // Validate
      await this.#handleValidate();
    } catch (error) {
      this.#state.setUploading(false);
      this.#state.setError(error.message);
      this.#showStep('upload');
    }
  }

  async #handleValidate() {
    try {
      const batch = this.#state.currentBatch;
      if (!batch) return;

      this.#state.setValidating(true, 0, 'Wird validiert...');

      await this.#importService.validateBatch(
        batch,
        (current, total) => {
          const progress = (current / total) * 100;
          this.#state.setValidating(true, progress, `Zeile ${current} von ${total}`);
        }
      );

      this.#state.setValidating(false);
      this.#state.setCurrentBatch(batch); // Trigger UI update

      // Select all importable records by default
      this.#state.selectAllRecords();

      this.#showStep('preview');
    } catch (error) {
      this.#state.setValidating(false);
      this.#state.setError(error.message);
    }
  }

  async #handleImport() {
    try {
      const batch = this.#state.currentBatch;
      if (!batch || !batch.canImport) return;

      const importableRecords = batch.getImportableRecords();
      const total = importableRecords.length;

      // Show elegant import overlay instead of switching steps
      this.#importOverlay.reset();
      this.#importOverlay.update({
        progress: 0,
        imported: 0,
        failed: 0,
        remaining: total,
        total,
        message: 'Import wird gestartet...',
      });
      this.#importOverlay.show();

      // Disable buttons during import
      this.#importButton.setDisabled(true);
      this.#cancelButton.setDisabled(true);

      // Track import state without triggering full UI updates
      this.#state.setImporting(true, 0, 'Wird importiert...');

      await this.#importService.importBatch(
        batch,
        {},
        (current, total, stats) => {
          const progress = (current / total) * 100;

          // Only update the overlay - don't trigger full state updates
          this.#importOverlay.update({
            progress,
            imported: stats.imported,
            failed: stats.failed,
            remaining: stats.remaining,
            total,
            message: this.#getImportMessage(stats),
          });
        }
      );

      // Hide overlay with a small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.#importOverlay.hide();

      this.#state.setImporting(false);
      this.#state.setCurrentBatch(batch);

      // Re-enable buttons
      this.#cancelButton.setDisabled(false);

      // Show result
      this.#showResultStep(batch);

      if (this.#onImportComplete) {
        this.#onImportComplete(batch);
      }
    } catch (error) {
      this.#importOverlay.hide();
      this.#state.setImporting(false);
      this.#state.setError(error.message);
      this.#cancelButton.setDisabled(false);
      this.#importButton.setDisabled(false);
    }
  }

  #getImportMessage(stats) {
    if (stats.failed > 0) {
      return `${stats.imported} importiert, ${stats.failed} fehlgeschlagen`;
    }
    return `${stats.imported} Einträge erfolgreich importiert`;
  }

  #showResultStep(batch) {
    this.#showStep('result');

    // Clear and rebuild result content
    this.#resultStep.innerHTML = '';

    const stats = this.#importService.getStatistics(batch);
    const isSuccess = stats.imported > 0 && stats.failed === 0;
    const isPartial = stats.imported > 0 && stats.failed > 0;

    const resultIcon = createElement('div', {
      className: `wifo-result-icon ${isSuccess ? 'wifo-result-success' : isPartial ? 'wifo-result-partial' : 'wifo-result-error'}`,
    }, [isSuccess ? '✓' : isPartial ? '!' : '✗']);

    const resultTitle = createElement('h3', { className: 'wifo-result-title' }, [
      isSuccess
        ? 'Import erfolgreich!'
        : isPartial
          ? 'Import teilweise erfolgreich'
          : 'Import fehlgeschlagen',
    ]);

    const resultMessage = createElement('p', { className: 'wifo-result-message' }, [
      `${stats.imported} von ${stats.total} Einträgen wurden importiert.`,
    ]);

    if (stats.failed > 0) {
      resultMessage.appendChild(
        createElement('span', { className: 'wifo-result-failed' }, [
          ` ${stats.failed} Einträge konnten nicht importiert werden.`,
        ])
      );
    }

    this.#resultStep.appendChild(resultIcon);
    this.#resultStep.appendChild(resultTitle);
    this.#resultStep.appendChild(resultMessage);
    this.#resultStep.appendChild(this.#statisticsSummary.element.cloneNode(true));
  }

  #handleRecordClick(record) {
    // Could show a detail modal for the record
    console.log('Record clicked:', record);
  }

  show() {
    document.body.appendChild(this.#element);
    this.#element.classList.add('wifo-dialog-visible');
  }

  hide() {
    this.#element.classList.remove('wifo-dialog-visible');
    setTimeout(() => {
      this.#element.remove();
      this.#state.reset();
      this.#showStep('upload');
      this.#cancelButton.setLabel('Abbrechen');
    }, 300);
  }

  destroy() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
    }
    this.hide();
  }

  get element() {
    return this.#element;
  }
}
