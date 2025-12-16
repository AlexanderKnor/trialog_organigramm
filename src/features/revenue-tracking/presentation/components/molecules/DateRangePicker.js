/**
 * Molecule: DateRangePicker
 * Date range selection with calendar picker
 */

import { createElement } from '../../../../../core/utils/index.js';

export class DateRangePicker {
  #element;
  #startDate;
  #endDate;
  #onChange;

  constructor(props = {}) {
    this.#startDate = props.startDate || null;
    this.#endDate = props.endDate || null;
    this.#onChange = props.onChange || (() => {});
    this.#element = this.#render();
  }

  #render() {
    const startInput = createElement('input', {
      type: 'date',
      className: 'date-range-input',
      value: this.#startDate ? this.#formatDateForInput(this.#startDate) : '',
      onchange: (e) => this.#handleStartChange(e),
    });

    const endInput = createElement('input', {
      type: 'date',
      className: 'date-range-input',
      value: this.#endDate ? this.#formatDateForInput(this.#endDate) : '',
      onchange: (e) => this.#handleEndChange(e),
    });

    // Quick select buttons
    const quickSelects = this.#renderQuickSelects();

    return createElement('div', { className: 'date-range-picker' }, [
      createElement('div', { className: 'date-range-inputs' }, [
        createElement('div', { className: 'date-input-group' }, [
          createElement('label', { className: 'date-input-label' }, ['Von']),
          startInput,
        ]),
        createElement('span', { className: 'date-range-separator' }, ['—']),
        createElement('div', { className: 'date-input-group' }, [
          createElement('label', { className: 'date-input-label' }, ['Bis']),
          endInput,
        ]),
      ]),
      quickSelects,
    ]);
  }

  #renderQuickSelects() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(today.getFullYear(), 11, 31);

    const quickOptions = [
      { label: 'Dieser Monat', start: firstDayOfMonth, end: lastDayOfMonth },
      { label: 'Dieses Jahr', start: firstDayOfYear, end: lastDayOfYear },
      { label: 'Letzter Monat', start: this.#getFirstDayOfPreviousMonth(), end: this.#getLastDayOfPreviousMonth() },
      { label: 'Letztes Jahr', start: new Date(today.getFullYear() - 1, 0, 1), end: new Date(today.getFullYear() - 1, 11, 31) },
      { label: 'Gesamter Zeitraum', start: null, end: null },
    ];

    const buttons = quickOptions.map((opt) =>
      createElement('button', {
        className: 'quick-select-btn',
        onclick: () => this.#applyQuickSelect(opt.start, opt.end),
      }, [opt.label])
    );

    return createElement('div', { className: 'date-quick-selects' }, buttons);
  }

  #getFirstDayOfPreviousMonth() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }

  #getLastDayOfPreviousMonth() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 0);
  }

  #handleStartChange(e) {
    const dateStr = e.target.value;
    this.#startDate = dateStr ? new Date(dateStr + 'T00:00:00') : null;
    this.#notifyChange();
  }

  #handleEndChange(e) {
    const dateStr = e.target.value;
    this.#endDate = dateStr ? new Date(dateStr + 'T23:59:59') : null;
    this.#notifyChange();
  }

  #applyQuickSelect(start, end) {
    this.#startDate = start;
    this.#endDate = end;
    this.#updateInputs();
    this.#notifyChange();
  }

  #updateInputs() {
    const startInput = this.#element.querySelector('.date-range-input:nth-of-type(1)');
    const endInput = this.#element.querySelector('.date-range-input:nth-of-type(2)');

    if (startInput) {
      startInput.value = this.#startDate ? this.#formatDateForInput(this.#startDate) : '';
    }
    if (endInput) {
      endInput.value = this.#endDate ? this.#formatDateForInput(this.#endDate) : '';
    }
  }

  #formatDateForInput(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  #notifyChange() {
    this.#onChange({
      startDate: this.#startDate,
      endDate: this.#endDate,
    });
  }

  get element() {
    return this.#element;
  }

  get startDate() {
    return this.#startDate;
  }

  get endDate() {
    return this.#endDate;
  }

  setRange(startDate, endDate) {
    this.#startDate = startDate;
    this.#endDate = endDate;
    this.#updateInputs();
  }
}
