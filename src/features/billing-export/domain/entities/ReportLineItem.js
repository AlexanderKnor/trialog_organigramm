/**
 * Entity: ReportLineItem
 * Represents a single revenue line item in a billing report
 */

import { generateUUID, roundCurrency } from '../../../../core/utils/index.js';

export const LINE_ITEM_SOURCES = {
  OWN: 'own',
  HIERARCHY: 'hierarchy',
  TIP_PROVIDER: 'tipProvider',
};

export class ReportLineItem {
  #id;
  #originalEntryId;
  #date;
  #customerName;
  #customerAddress;
  #categoryType;
  #categoryDisplayName;
  #productName;
  #providerName;
  #contractNumber;
  #netAmount;
  #vatRate;
  #vatAmount;
  #grossAmount;
  #provisionPercentage;
  #provisionAmount;
  #provisionVatRate;
  #provisionVatAmount;
  #provisionGrossAmount;
  #source;
  #subordinateName;
  #subordinateId;
  #status;

  constructor({
    id = null,
    originalEntryId,
    date,
    customerName,
    customerAddress = '',
    categoryType,
    categoryDisplayName,
    productName,
    providerName,
    contractNumber,
    netAmount,
    vatRate = 0,
    vatAmount = 0,
    grossAmount,
    provisionPercentage,
    provisionAmount,
    provisionVatRate = 0,
    provisionVatAmount = 0,
    provisionGrossAmount = null,
    source = LINE_ITEM_SOURCES.OWN,
    subordinateName = null,
    subordinateId = null,
    status = null,
  }) {
    this.#id = id || generateUUID();
    this.#originalEntryId = originalEntryId;
    this.#date = date instanceof Date ? date : new Date(date);
    this.#customerName = customerName;
    this.#customerAddress = customerAddress;
    this.#categoryType = categoryType;
    this.#categoryDisplayName = categoryDisplayName;
    this.#productName = productName;
    this.#providerName = providerName;
    this.#contractNumber = contractNumber;
    this.#netAmount = roundCurrency(netAmount || 0);
    this.#vatRate = vatRate;
    this.#vatAmount = roundCurrency(vatAmount || 0);
    this.#grossAmount = roundCurrency(grossAmount || 0);
    this.#provisionPercentage = provisionPercentage;
    this.#provisionAmount = roundCurrency(provisionAmount || 0);
    this.#provisionVatRate = provisionVatRate;
    this.#provisionVatAmount = roundCurrency(provisionVatAmount || 0);
    // provisionAmount IS the gross provision (calculated from gross revenue)
    this.#provisionGrossAmount = provisionGrossAmount !== null
      ? roundCurrency(provisionGrossAmount)
      : this.#provisionAmount;
    this.#source = source;
    this.#subordinateName = subordinateName;
    this.#subordinateId = subordinateId;
    this.#status = status;
  }

  get id() { return this.#id; }
  get originalEntryId() { return this.#originalEntryId; }
  get date() { return this.#date; }
  get customerName() { return this.#customerName; }
  get customerAddress() { return this.#customerAddress; }
  get categoryType() { return this.#categoryType; }
  get categoryDisplayName() { return this.#categoryDisplayName; }
  get productName() { return this.#productName; }
  get providerName() { return this.#providerName; }
  get contractNumber() { return this.#contractNumber; }
  get netAmount() { return this.#netAmount; }
  get vatRate() { return this.#vatRate; }
  get vatAmount() { return this.#vatAmount; }
  get grossAmount() { return this.#grossAmount; }
  get provisionPercentage() { return this.#provisionPercentage; }
  get provisionAmount() { return this.#provisionAmount; }
  get provisionVatRate() { return this.#provisionVatRate; }
  get provisionVatAmount() { return this.#provisionVatAmount; }
  get provisionGrossAmount() { return this.#provisionGrossAmount; }
  get provisionNetAmount() { return roundCurrency(this.#provisionAmount - this.#provisionVatAmount); }
  get source() { return this.#source; }
  get subordinateName() { return this.#subordinateName; }
  get subordinateId() { return this.#subordinateId; }
  get status() { return this.#status; }

  get dateFormatted() {
    const d = this.#date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  get hasVat() {
    return this.#vatRate > 0 && this.#vatAmount > 0;
  }

  get hasProvisionVat() {
    return this.#provisionVatRate > 0 && this.#provisionVatAmount > 0;
  }

  get isOwnRevenue() {
    return this.#source === LINE_ITEM_SOURCES.OWN;
  }

  get isHierarchyRevenue() {
    return this.#source === LINE_ITEM_SOURCES.HIERARCHY;
  }

  get isTipProviderRevenue() {
    return this.#source === LINE_ITEM_SOURCES.TIP_PROVIDER;
  }

  get sourceDisplayName() {
    switch (this.#source) {
      case LINE_ITEM_SOURCES.OWN:
        return 'Eigene Umsätze';
      case LINE_ITEM_SOURCES.HIERARCHY:
        return 'Team-Umsätze';
      case LINE_ITEM_SOURCES.TIP_PROVIDER:
        return 'Tippgeber-Umsätze';
      default:
        return 'Sonstige';
    }
  }

  toJSON() {
    return {
      id: this.#id,
      originalEntryId: this.#originalEntryId,
      date: this.#date.toISOString(),
      customerName: this.#customerName,
      customerAddress: this.#customerAddress,
      categoryType: this.#categoryType,
      categoryDisplayName: this.#categoryDisplayName,
      productName: this.#productName,
      providerName: this.#providerName,
      contractNumber: this.#contractNumber,
      netAmount: this.#netAmount,
      vatRate: this.#vatRate,
      vatAmount: this.#vatAmount,
      grossAmount: this.#grossAmount,
      provisionPercentage: this.#provisionPercentage,
      provisionAmount: this.#provisionAmount,
      provisionVatRate: this.#provisionVatRate,
      provisionVatAmount: this.#provisionVatAmount,
      provisionGrossAmount: this.#provisionGrossAmount,
      source: this.#source,
      subordinateName: this.#subordinateName,
      subordinateId: this.#subordinateId,
      status: this.#status,
    };
  }

  static fromJSON(json) {
    if (!json) return null;
    return new ReportLineItem(json);
  }
}
