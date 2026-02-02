/**
 * Molecule: PeriodSelector
 * UI component for selecting billing periods (month/quarter/year)
 */

import { createElement } from '../../../../../core/utils/index.js';
import { ReportPeriod } from '../../../domain/value-objects/ReportPeriod.js';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export class PeriodSelector {
  #element;
  #props;
  #selectedYear;
  #selectedMonth;
  #yearSelect;
  #monthSelect;

  constructor(props = {}) {
    const now = new Date();

    this.#props = {
      onChange: props.onChange || null,
      initialYear: props.initialYear || now.getFullYear(),
      initialMonth: props.initialMonth ?? now.getMonth(),
      className: props.className || '',
    };

    this.#selectedYear = this.#props.initialYear;
    this.#selectedMonth = this.#props.initialMonth;

    this.#element = this.#render();
  }

  #render() {
    const container = createElement('div', {
      className: `period-selector ${this.#props.className}`.trim(),
    });

    const quickSelectRow = this.#renderQuickSelect();

    const manualSelectRow = this.#renderManualSelect();

    container.appendChild(quickSelectRow);
    container.appendChild(manualSelectRow);

    return container;
  }

  #renderQuickSelect() {
    const row = createElement('div', { className: 'period-quick-select' });

    const currentMonthBtn = createElement('button', {
      type: 'button',
      className: 'period-quick-btn',
      onclick: () => this.#selectCurrentMonth(),
    }, ['Aktueller Monat']);

    const lastMonthBtn = createElement('button', {
      type: 'button',
      className: 'period-quick-btn',
      onclick: () => this.#selectLastMonth(),
    }, ['Letzter Monat']);

    const currentQuarterBtn = createElement('button', {
      type: 'button',
      className: 'period-quick-btn',
      onclick: () => this.#selectCurrentQuarter(),
    }, ['Aktuelles Quartal']);

    row.appendChild(currentMonthBtn);
    row.appendChild(lastMonthBtn);
    row.appendChild(currentQuarterBtn);

    return row;
  }

  #renderManualSelect() {
    const row = createElement('div', { className: 'period-manual-select' });

    const yearWrapper = createElement('div', { className: 'period-select-wrapper' });
    const yearLabel = createElement('label', { className: 'period-select-label' }, ['Jahr']);

    this.#yearSelect = createElement('select', {
      className: 'period-select',
      onchange: () => this.#onSelectionChange(),
    });

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const option = createElement('option', {
        value: year.toString(),
        selected: year === this.#selectedYear,
      }, [year.toString()]);
      this.#yearSelect.appendChild(option);
    }

    yearWrapper.appendChild(yearLabel);
    yearWrapper.appendChild(this.#yearSelect);

    const monthWrapper = createElement('div', { className: 'period-select-wrapper' });
    const monthLabel = createElement('label', { className: 'period-select-label' }, ['Monat']);

    this.#monthSelect = createElement('select', {
      className: 'period-select',
      onchange: () => this.#onSelectionChange(),
    });

    MONTH_NAMES.forEach((name, index) => {
      const option = createElement('option', {
        value: index.toString(),
        selected: index === this.#selectedMonth,
      }, [name]);
      this.#monthSelect.appendChild(option);
    });

    monthWrapper.appendChild(monthLabel);
    monthWrapper.appendChild(this.#monthSelect);

    row.appendChild(monthWrapper);
    row.appendChild(yearWrapper);

    return row;
  }

  #selectCurrentMonth() {
    const now = new Date();
    this.#updateSelection(now.getFullYear(), now.getMonth());
    this.#notifyChange();
  }

  #selectLastMonth() {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    this.#updateSelection(year, lastMonth);
    this.#notifyChange();
  }

  #selectCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const period = ReportPeriod.forQuarter(now.getFullYear(), quarter);

    this.#selectedYear = now.getFullYear();
    this.#selectedMonth = (quarter - 1) * 3;

    this.#yearSelect.value = this.#selectedYear.toString();
    this.#monthSelect.value = this.#selectedMonth.toString();

    if (this.#props.onChange) {
      this.#props.onChange(period);
    }
  }

  #updateSelection(year, month) {
    this.#selectedYear = year;
    this.#selectedMonth = month;
    this.#yearSelect.value = year.toString();
    this.#monthSelect.value = month.toString();
  }

  #onSelectionChange() {
    this.#selectedYear = parseInt(this.#yearSelect.value, 10);
    this.#selectedMonth = parseInt(this.#monthSelect.value, 10);
    this.#notifyChange();
  }

  #notifyChange() {
    if (this.#props.onChange) {
      const period = ReportPeriod.forMonth(this.#selectedYear, this.#selectedMonth);
      this.#props.onChange(period);
    }
  }

  getPeriod() {
    return ReportPeriod.forMonth(this.#selectedYear, this.#selectedMonth);
  }

  setYear(year) {
    this.#selectedYear = year;
    this.#yearSelect.value = year.toString();
  }

  setMonth(month) {
    this.#selectedMonth = month;
    this.#monthSelect.value = month.toString();
  }

  get element() {
    return this.#element;
  }
}
