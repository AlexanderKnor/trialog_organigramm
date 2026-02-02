/**
 * Value Object: ReportPeriod
 * Represents a billing period (month, quarter, year, or custom range)
 */

import { ValidationError } from '../../../../core/errors/index.js';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export class ReportPeriod {
  #startDate;
  #endDate;
  #type;

  constructor({ startDate, endDate, type = 'custom' }) {
    this.#validateDates(startDate, endDate);
    this.#startDate = this.#normalizeDate(startDate);
    this.#endDate = this.#normalizeDate(endDate, true);
    this.#type = type;
  }

  #validateDates(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new ValidationError('Start- und Enddatum sind erforderlich', 'period');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new ValidationError('Startdatum ungültig', 'startDate');
    }

    if (isNaN(end.getTime())) {
      throw new ValidationError('Enddatum ungültig', 'endDate');
    }

    if (end < start) {
      throw new ValidationError('Enddatum muss nach Startdatum liegen', 'endDate');
    }
  }

  #normalizeDate(date, endOfDay = false) {
    const d = new Date(date);
    if (endOfDay) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  get startDate() {
    return this.#startDate;
  }

  get endDate() {
    return this.#endDate;
  }

  get type() {
    return this.#type;
  }

  get displayName() {
    if (this.#type === 'month') {
      return `${MONTH_NAMES[this.#startDate.getMonth()]} ${this.#startDate.getFullYear()}`;
    }

    if (this.#type === 'quarter') {
      const quarter = Math.floor(this.#startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${this.#startDate.getFullYear()}`;
    }

    if (this.#type === 'year') {
      return `Jahr ${this.#startDate.getFullYear()}`;
    }

    const formatDate = (date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    return `${formatDate(this.#startDate)} - ${formatDate(this.#endDate)}`;
  }

  get shortDisplayName() {
    if (this.#type === 'month') {
      const month = (this.#startDate.getMonth() + 1).toString().padStart(2, '0');
      return `${month}/${this.#startDate.getFullYear()}`;
    }
    return this.displayName;
  }

  containsDate(date) {
    const d = new Date(date);
    return d >= this.#startDate && d <= this.#endDate;
  }

  static forMonth(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return new ReportPeriod({ startDate, endDate, type: 'month' });
  }

  static forCurrentMonth() {
    const now = new Date();
    return ReportPeriod.forMonth(now.getFullYear(), now.getMonth());
  }

  static forLastMonth() {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return ReportPeriod.forMonth(year, lastMonth);
  }

  static forQuarter(year, quarter) {
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0);
    return new ReportPeriod({ startDate, endDate, type: 'quarter' });
  }

  static forCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return ReportPeriod.forQuarter(now.getFullYear(), quarter);
  }

  static forYear(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    return new ReportPeriod({ startDate, endDate, type: 'year' });
  }

  static custom(startDate, endDate) {
    return new ReportPeriod({ startDate, endDate, type: 'custom' });
  }

  toJSON() {
    return {
      startDate: this.#startDate.toISOString(),
      endDate: this.#endDate.toISOString(),
      type: this.#type,
      displayName: this.displayName,
    };
  }

  static fromJSON(json) {
    if (!json) return null;
    return new ReportPeriod({
      startDate: json.startDate,
      endDate: json.endDate,
      type: json.type || 'custom',
    });
  }
}
