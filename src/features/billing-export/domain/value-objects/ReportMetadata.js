/**
 * Value Object: ReportMetadata
 * Metadata about report generation (timestamp, version, generator info)
 */

import { generateUUID } from '../../../../core/utils/index.js';

export class ReportMetadata {
  #reportNumber;
  #generatedAt;
  #generatedBy;
  #generatedByName;
  #version;

  constructor({
    reportNumber = null,
    generatedAt = null,
    generatedBy = null,
    generatedByName = null,
    version = '1.0',
  } = {}) {
    this.#reportNumber = reportNumber || this.#generateReportNumber();
    this.#generatedAt = generatedAt ? new Date(generatedAt) : new Date();
    this.#generatedBy = generatedBy;
    this.#generatedByName = generatedByName;
    this.#version = version;
  }

  #generateReportNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${year}-${month}-${random}`;
  }

  get reportNumber() {
    return this.#reportNumber;
  }

  get generatedAt() {
    return this.#generatedAt;
  }

  get generatedAtFormatted() {
    const d = this.#generatedAt;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  get generatedAtDateOnly() {
    const d = this.#generatedAt;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  get generatedBy() {
    return this.#generatedBy;
  }

  get generatedByName() {
    return this.#generatedByName;
  }

  get version() {
    return this.#version;
  }

  toJSON() {
    return {
      reportNumber: this.#reportNumber,
      generatedAt: this.#generatedAt.toISOString(),
      generatedBy: this.#generatedBy,
      generatedByName: this.#generatedByName,
      version: this.#version,
    };
  }

  static fromJSON(json) {
    if (!json) return new ReportMetadata();
    return new ReportMetadata({
      reportNumber: json.reportNumber,
      generatedAt: json.generatedAt,
      generatedBy: json.generatedBy,
      generatedByName: json.generatedByName,
      version: json.version,
    });
  }

  static create(generatedBy, generatedByName) {
    return new ReportMetadata({
      generatedBy,
      generatedByName,
    });
  }
}
