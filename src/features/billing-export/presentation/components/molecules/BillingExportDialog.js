/**
 * Molecule: BillingExportDialog
 * Dialog for configuring and exporting billing reports
 */

import { createElement } from '../../../../../core/utils/index.js';
import { Logger } from '../../../../../core/utils/logger.js';
import { Button } from '../../../../hierarchy-tracking/presentation/components/atoms/Button.js';
import { PeriodSelector } from './PeriodSelector.js';
import { BillingReportService } from '../../../domain/services/BillingReportService.js';
import { PdfGeneratorService } from '../../../domain/services/PdfGeneratorService.js';

export class BillingExportDialog {
  #element;
  #props;
  #periodSelector;
  #includeHierarchyCheckbox;
  #includeTipProviderCheckbox;
  #exportButton;
  #cancelButton;
  #isLoading;
  #loadingOverlay;
  #billingReportService;
  #pdfGeneratorService;

  constructor(props = {}) {
    this.#props = {
      employeeId: props.employeeId,
      employeeName: props.employeeName || 'Mitarbeiter',
      revenueService: props.revenueService,
      profileService: props.profileService,
      hierarchyService: props.hierarchyService,
      generatedBy: props.generatedBy || null,
      generatedByName: props.generatedByName || null,
      onExportComplete: props.onExportComplete || null,
      onCancel: props.onCancel || null,
      className: props.className || '',
    };

    this.#isLoading = false;

    this.#billingReportService = new BillingReportService(
      this.#props.revenueService,
      this.#props.profileService,
      this.#props.hierarchyService
    );
    this.#pdfGeneratorService = new PdfGeneratorService();

    this.#element = this.#render();
  }

  #render() {
    const overlay = createElement('div', { className: 'dialog-overlay billing-export-dialog-overlay' });

    const dialogContent = createElement('div', {
      className: `dialog-content billing-export-dialog ${this.#props.className}`.trim(),
    });

    const header = this.#renderHeader();

    const body = this.#renderBody();

    const footer = this.#renderFooter();

    this.#loadingOverlay = this.#renderLoadingOverlay();

    dialogContent.appendChild(header);
    dialogContent.appendChild(body);
    dialogContent.appendChild(footer);
    dialogContent.appendChild(this.#loadingOverlay);

    overlay.appendChild(dialogContent);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !this.#isLoading) {
        this.#handleCancel();
      }
    });

    return overlay;
  }

  #renderHeader() {
    return createElement('div', { className: 'dialog-header-fixed' }, [
      createElement('h2', { className: 'dialog-title' }, ['Abrechnung exportieren']),
      createElement('p', { className: 'dialog-subtitle' }, [
        `Mitarbeiter: ${this.#props.employeeName}`,
      ]),
    ]);
  }

  #renderBody() {
    const body = createElement('div', { className: 'dialog-body-scroll billing-export-body' });

    const periodSection = createElement('div', { className: 'billing-export-section' });
    const periodTitle = createElement('h3', { className: 'billing-export-section-title' }, [
      'Abrechnungszeitraum',
    ]);

    this.#periodSelector = new PeriodSelector({
      onChange: (period) => this.#onPeriodChange(period),
    });

    periodSection.appendChild(periodTitle);
    periodSection.appendChild(this.#periodSelector.element);

    const optionsSection = createElement('div', { className: 'billing-export-section' });
    const optionsTitle = createElement('h3', { className: 'billing-export-section-title' }, [
      'Umsatzquellen einbeziehen',
    ]);

    const checkboxesWrapper = createElement('div', { className: 'billing-export-checkboxes' });

    const hierarchyLabel = createElement('label', { className: 'billing-export-checkbox-label' });
    this.#includeHierarchyCheckbox = createElement('input', {
      type: 'checkbox',
      checked: true,
      className: 'billing-export-checkbox',
    });
    hierarchyLabel.appendChild(this.#includeHierarchyCheckbox);
    hierarchyLabel.appendChild(createElement('span', {}, ['Team-Umsätze (Hierarchie-Provision)']));

    const tipProviderLabel = createElement('label', { className: 'billing-export-checkbox-label' });
    this.#includeTipProviderCheckbox = createElement('input', {
      type: 'checkbox',
      checked: true,
      className: 'billing-export-checkbox',
    });
    tipProviderLabel.appendChild(this.#includeTipProviderCheckbox);
    tipProviderLabel.appendChild(createElement('span', {}, ['Tippgeber-Umsätze']));

    const ownRevenueNote = createElement('p', { className: 'billing-export-note' }, [
      'Eigene Umsätze werden immer einbezogen.',
    ]);

    checkboxesWrapper.appendChild(hierarchyLabel);
    checkboxesWrapper.appendChild(tipProviderLabel);

    optionsSection.appendChild(optionsTitle);
    optionsSection.appendChild(checkboxesWrapper);
    optionsSection.appendChild(ownRevenueNote);

    body.appendChild(periodSection);
    body.appendChild(optionsSection);

    return body;
  }

  #renderFooter() {
    const footer = createElement('div', { className: 'dialog-actions billing-export-actions' });

    this.#cancelButton = new Button({
      label: 'Abbrechen',
      variant: 'ghost',
      onClick: () => this.#handleCancel(),
    });

    this.#exportButton = new Button({
      label: 'PDF exportieren',
      variant: 'primary',
      onClick: () => this.#handleExport(),
    });

    footer.appendChild(this.#cancelButton.element);
    footer.appendChild(this.#exportButton.element);

    return footer;
  }

  #renderLoadingOverlay() {
    const overlay = createElement('div', { className: 'billing-export-loading-overlay hidden' });

    const spinner = createElement('div', { className: 'loading-spinner' });
    const message = createElement('p', { className: 'billing-export-loading-message' }, [
      'Abrechnung wird generiert...',
    ]);

    overlay.appendChild(spinner);
    overlay.appendChild(message);

    return overlay;
  }

  #onPeriodChange(period) {
    Logger.log('Period changed:', period.displayName);
  }

  async #handleExport() {
    if (this.#isLoading) return;

    this.#setLoading(true);

    try {
      const period = this.#periodSelector.getPeriod();
      const includeHierarchy = this.#includeHierarchyCheckbox.checked;
      const includeTipProvider = this.#includeTipProviderCheckbox.checked;

      Logger.log('Generating billing report...');
      Logger.log('Employee:', this.#props.employeeId);
      Logger.log('Period:', period.displayName);
      Logger.log('Include hierarchy:', includeHierarchy);
      Logger.log('Include tip provider:', includeTipProvider);

      const report = await this.#billingReportService.generateReport(
        this.#props.employeeId,
        period,
        {
          includeHierarchy,
          includeTipProvider,
          generatedBy: this.#props.generatedBy,
          generatedByName: this.#props.generatedByName,
        }
      );

      if (report.isEmpty) {
        this.#setLoading(false);
        alert('Keine Umsätze im ausgewählten Zeitraum gefunden.');
        return;
      }

      Logger.log('Report generated, creating PDF...');

      const { blob, fileName } = await this.#pdfGeneratorService.generatePdf(report);

      Logger.log('PDF created, downloading:', fileName);
      this.#pdfGeneratorService.downloadPdf(blob, fileName);

      this.#setLoading(false);

      if (this.#props.onExportComplete) {
        this.#props.onExportComplete(report);
      }

      this.hide();
    } catch (error) {
      Logger.error('Export failed:', error);
      this.#setLoading(false);
      alert(`Export fehlgeschlagen: ${error.message}`);
    }
  }

  #handleCancel() {
    if (this.#isLoading) return;

    if (this.#props.onCancel) {
      this.#props.onCancel();
    }

    this.hide();
  }

  #setLoading(loading) {
    this.#isLoading = loading;

    if (loading) {
      this.#loadingOverlay.classList.remove('hidden');
      this.#exportButton.element.disabled = true;
      this.#cancelButton.element.disabled = true;
    } else {
      this.#loadingOverlay.classList.add('hidden');
      this.#exportButton.element.disabled = false;
      this.#cancelButton.element.disabled = false;
    }
  }

  show() {
    document.body.appendChild(this.#element);

    requestAnimationFrame(() => {
      this.#element.classList.add('visible');
    });
  }

  hide() {
    this.#element.classList.remove('visible');

    setTimeout(() => {
      if (this.#element.parentNode) {
        this.#element.parentNode.removeChild(this.#element);
      }
    }, 300);
  }

  get element() {
    return this.#element;
  }
}
