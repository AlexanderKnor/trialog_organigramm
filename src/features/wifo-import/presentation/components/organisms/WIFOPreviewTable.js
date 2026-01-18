/**
 * Organism: WIFOPreviewTable
 * Displays WIFO import records in a table with validation status
 */

import { createElement } from '../../../../../core/utils/index.js';
import { RECORD_VALIDATION_STATUS_DISPLAY } from '../../../domain/value-objects/RecordValidationStatus.js';

export class WIFOPreviewTable {
  #element;
  #tableBody;
  #records;
  #onRecordClick;
  #onRecordSelect;
  #selectedIds;

  constructor({ onRecordClick = null, onRecordSelect = null }) {
    this.#records = [];
    this.#selectedIds = new Set();
    this.#onRecordClick = onRecordClick;
    this.#onRecordSelect = onRecordSelect;
    this.#element = this.#render();
  }

  #render() {
    const container = createElement('div', { className: 'wifo-table-container' });

    // Table
    const table = createElement('table', { className: 'wifo-preview-table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');

    const headers = [
      { key: 'select', label: '', width: '40px' },
      { key: 'status', label: 'Status', width: '100px' },
      { key: 'row', label: '#', width: '50px' },
      { key: 'datum', label: 'Datum', width: '100px' },
      { key: 'vermittler', label: 'Vermittler', width: '150px' },
      { key: 'kunde', label: 'Kunde', width: '150px' },
      { key: 'sparte', label: 'Sparte', width: '80px' },
      { key: 'gesellschaft', label: 'Gesellschaft', width: '200px' },
      { key: 'netto', label: 'Netto', width: '100px' },
      { key: 'errors', label: 'Fehler', width: '200px' },
    ];

    for (const header of headers) {
      const th = createElement('th', {
        style: header.width ? `width: ${header.width}` : '',
      }, [header.label]);
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    this.#tableBody = createElement('tbody');
    table.appendChild(this.#tableBody);

    container.appendChild(table);

    // Empty state
    const emptyState = createElement('div', { className: 'wifo-table-empty' }, [
      'Keine Datensätze vorhanden',
    ]);
    container.appendChild(emptyState);

    return container;
  }

  setRecords(records, selectedIds = new Set()) {
    this.#records = records;
    this.#selectedIds = selectedIds;
    this.#renderRows();
  }

  #renderRows() {
    this.#tableBody.innerHTML = '';

    const emptyState = this.#element.querySelector('.wifo-table-empty');

    if (this.#records.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    for (const record of this.#records) {
      const row = this.#createRow(record);
      this.#tableBody.appendChild(row);
    }
  }

  #createRow(record) {
    const statusClass = this.#getStatusClass(record.validationStatus.value);
    const isSelected = this.#selectedIds.has(record.id);

    const row = createElement('tr', {
      className: `wifo-table-row ${statusClass} ${isSelected ? 'wifo-table-row-selected' : ''}`,
      'data-record-id': record.id,
    });

    // Select checkbox
    const selectCell = createElement('td', { className: 'wifo-table-cell-select' });
    const checkbox = createElement('input', {
      type: 'checkbox',
      checked: isSelected,
      disabled: !record.canImport,
    });
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (this.#onRecordSelect) {
        this.#onRecordSelect(record.id);
      }
    });
    selectCell.appendChild(checkbox);
    row.appendChild(selectCell);

    // Status
    const statusCell = createElement('td', { className: 'wifo-table-cell-status' });
    const statusBadge = createElement('span', {
      className: `wifo-status-badge wifo-status-${record.validationStatus.value}`,
    }, [RECORD_VALIDATION_STATUS_DISPLAY[record.validationStatus.value]]);
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    // Row number
    row.appendChild(createElement('td', {}, [record.rowNumber?.toString() || '-']));

    // Datum
    const datumStr = record.datum
      ? new Date(record.datum).toLocaleDateString('de-DE')
      : '-';
    row.appendChild(createElement('td', {}, [datumStr]));

    // Vermittler
    const vermittlerCell = createElement('td', { className: 'wifo-table-cell-vermittler' });
    if (record.mappedEmployeeName) {
      vermittlerCell.innerHTML = `<span class="wifo-mapped">${record.mappedEmployeeName}</span>`;
    } else {
      vermittlerCell.textContent = record.vermittlerName || '-';
    }
    row.appendChild(vermittlerCell);

    // Kunde
    row.appendChild(createElement('td', {}, [record.kundeName || '-']));

    // Sparte
    row.appendChild(createElement('td', {}, [record.sparte || '-']));

    // Gesellschaft
    const gesellschaftCell = createElement('td', { className: 'wifo-table-cell-truncate' });
    gesellschaftCell.textContent = record.gesellschaft || '-';
    gesellschaftCell.title = record.gesellschaft || '';
    row.appendChild(gesellschaftCell);

    // Netto
    const nettoStr = typeof record.netto === 'number'
      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(record.netto)
      : '-';
    row.appendChild(createElement('td', { className: 'wifo-table-cell-amount' }, [nettoStr]));

    // Errors
    const errorsCell = createElement('td', { className: 'wifo-table-cell-errors' });
    if (record.validationErrors.length > 0) {
      const errorList = this.#createErrorList(record.validationErrors);
      errorsCell.appendChild(errorList);
    }
    row.appendChild(errorsCell);

    // Click handler
    row.addEventListener('click', () => {
      if (this.#onRecordClick) {
        this.#onRecordClick(record);
      }
    });

    return row;
  }

  #getStatusClass(status) {
    const statusClasses = {
      pending: 'wifo-row-pending',
      valid: 'wifo-row-valid',
      warning: 'wifo-row-warning',
      invalid: 'wifo-row-invalid',
      skipped: 'wifo-row-skipped',
      imported: 'wifo-row-imported',
      failed: 'wifo-row-failed',
    };
    return statusClasses[status] || '';
  }

  #createErrorList(errors) {
    const container = createElement('div', { className: 'wifo-error-list' });
    const maxVisibleErrors = 2;
    const visibleErrors = errors.slice(0, maxVisibleErrors);
    const hiddenCount = errors.length - maxVisibleErrors;

    for (const error of visibleErrors) {
      const errorItem = this.#createErrorItem(error);
      container.appendChild(errorItem);
    }

    if (hiddenCount > 0) {
      const moreBtn = createElement('span', { className: 'wifo-error-more' }, [
        `+${hiddenCount} weitere`,
      ]);
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.#showAllErrors(errors, container, moreBtn);
      });
      container.appendChild(moreBtn);
    }

    return container;
  }

  #createErrorItem(error) {
    const severity = error.severity || 'error';
    const itemClass = `wifo-error-item wifo-error-item-${severity}`;
    const item = createElement('div', { className: itemClass });

    // Icon
    const icon = this.#getErrorIcon(severity);
    item.appendChild(icon);

    // Text
    const text = createElement('span', { className: 'wifo-error-text' }, [
      error.fullMessage || error.message,
    ]);
    item.appendChild(text);

    return item;
  }

  #getErrorIcon(severity) {
    const iconWrapper = createElement('span', {
      className: `wifo-error-icon wifo-error-icon-${severity}`,
    });

    let svgPath;
    switch (severity) {
      case 'warning':
        svgPath = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
        break;
      case 'info':
        svgPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        break;
      default:
        svgPath = 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    }

    iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="${svgPath}" /></svg>`;
    return iconWrapper;
  }

  #showAllErrors(errors, container, moreBtn) {
    // Remove "more" button
    moreBtn.remove();

    // Add remaining errors
    const remainingErrors = errors.slice(2);
    for (const error of remainingErrors) {
      const errorItem = this.#createErrorItem(error);
      container.appendChild(errorItem);
    }
  }

  updateSelection(selectedIds) {
    this.#selectedIds = selectedIds;

    const rows = this.#tableBody.querySelectorAll('.wifo-table-row');
    for (const row of rows) {
      const recordId = row.dataset.recordId;
      const isSelected = this.#selectedIds.has(recordId);
      const checkbox = row.querySelector('input[type="checkbox"]');

      if (isSelected) {
        row.classList.add('wifo-table-row-selected');
      } else {
        row.classList.remove('wifo-table-row-selected');
      }

      if (checkbox) {
        checkbox.checked = isSelected;
      }
    }
  }

  get element() {
    return this.#element;
  }
}
