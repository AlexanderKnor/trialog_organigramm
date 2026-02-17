/**
 * Entity: BillingReport (Aggregate Root)
 * Complete billing report for an employee including all revenue sources
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ReportMetadata } from '../value-objects/ReportMetadata.js';
import { ProvisionSummary } from '../value-objects/ProvisionSummary.js';
import { LINE_ITEM_SOURCES } from './ReportLineItem.js';

export class BillingReport {
  #id;
  #employeeDetails;
  #period;
  #metadata;
  #ownLineItems;
  #hierarchyLineItems;
  #tipProviderLineItems;
  #ownSummary;
  #hierarchySummary;
  #tipProviderSummary;
  #excludedEntryCount;

  constructor({
    id = null,
    employeeDetails,
    period,
    metadata = null,
    ownLineItems = [],
    hierarchyLineItems = [],
    tipProviderLineItems = [],
    excludedEntryCount = 0,
  }) {
    this.#id = id || generateUUID();
    this.#employeeDetails = employeeDetails;
    this.#period = period;
    this.#metadata = metadata instanceof ReportMetadata
      ? metadata
      : ReportMetadata.fromJSON(metadata) || new ReportMetadata();
    this.#ownLineItems = [...ownLineItems];
    this.#hierarchyLineItems = [...hierarchyLineItems];
    this.#tipProviderLineItems = [...tipProviderLineItems];

    this.#ownSummary = ProvisionSummary.fromLineItems(ownLineItems);
    this.#hierarchySummary = ProvisionSummary.fromLineItems(hierarchyLineItems);
    this.#tipProviderSummary = ProvisionSummary.fromLineItems(tipProviderLineItems);
    this.#excludedEntryCount = excludedEntryCount;
  }

  get id() { return this.#id; }
  get employeeDetails() { return this.#employeeDetails; }
  get period() { return this.#period; }
  get metadata() { return this.#metadata; }

  get ownLineItems() { return [...this.#ownLineItems]; }
  get hierarchyLineItems() { return [...this.#hierarchyLineItems]; }
  get tipProviderLineItems() { return [...this.#tipProviderLineItems]; }

  get ownSummary() { return this.#ownSummary; }
  get hierarchySummary() { return this.#hierarchySummary; }
  get tipProviderSummary() { return this.#tipProviderSummary; }

  get allLineItems() {
    return [
      ...this.#ownLineItems,
      ...this.#hierarchyLineItems,
      ...this.#tipProviderLineItems,
    ];
  }

  get totalLineItemCount() {
    return this.#ownLineItems.length +
           this.#hierarchyLineItems.length +
           this.#tipProviderLineItems.length;
  }

  get totalSummary() {
    return this.#ownSummary
      .add(this.#hierarchySummary)
      .add(this.#tipProviderSummary);
  }

  get totalProvision() {
    return this.#ownSummary.totalProvision +
           this.#hierarchySummary.totalProvision +
           this.#tipProviderSummary.totalProvision;
  }

  get totalProvisionVat() {
    return this.#ownSummary.totalProvisionVat +
           this.#hierarchySummary.totalProvisionVat +
           this.#tipProviderSummary.totalProvisionVat;
  }

  get totalProvisionGross() {
    return this.#ownSummary.totalProvisionGross +
           this.#hierarchySummary.totalProvisionGross +
           this.#tipProviderSummary.totalProvisionGross;
  }

  get isSmallBusiness() {
    return this.#employeeDetails?.isSmallBusiness ?? false;
  }

  get hasOwnRevenue() {
    return this.#ownLineItems.length > 0;
  }

  get hasHierarchyRevenue() {
    return this.#hierarchyLineItems.length > 0;
  }

  get hasTipProviderRevenue() {
    return this.#tipProviderLineItems.length > 0;
  }

  get isEmpty() {
    return this.totalLineItemCount === 0;
  }

  get ownEntryIds() {
    return this.#ownLineItems.map(item => item.originalEntryId);
  }

  get excludedEntryCount() { return this.#excludedEntryCount; }

  get hasExcludedEntries() {
    return this.#excludedEntryCount > 0;
  }

  getLineItemsBySource(source) {
    switch (source) {
      case LINE_ITEM_SOURCES.OWN:
        return this.#ownLineItems;
      case LINE_ITEM_SOURCES.HIERARCHY:
        return this.#hierarchyLineItems;
      case LINE_ITEM_SOURCES.TIP_PROVIDER:
        return this.#tipProviderLineItems;
      default:
        return [];
    }
  }

  getSummaryBySource(source) {
    switch (source) {
      case LINE_ITEM_SOURCES.OWN:
        return this.#ownSummary;
      case LINE_ITEM_SOURCES.HIERARCHY:
        return this.#hierarchySummary;
      case LINE_ITEM_SOURCES.TIP_PROVIDER:
        return this.#tipProviderSummary;
      default:
        return new ProvisionSummary();
    }
  }

  getLineItemsByCategory(categoryType) {
    return this.allLineItems.filter(item => item.categoryType === categoryType);
  }

  getLineItemsSortedByDate(ascending = true) {
    const items = this.allLineItems;
    return items.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      return ascending ? diff : -diff;
    });
  }

  toJSON() {
    return {
      id: this.#id,
      employeeDetails: this.#employeeDetails.toJSON(),
      period: this.#period.toJSON(),
      metadata: this.#metadata.toJSON(),
      ownLineItems: this.#ownLineItems.map(item => item.toJSON()),
      hierarchyLineItems: this.#hierarchyLineItems.map(item => item.toJSON()),
      tipProviderLineItems: this.#tipProviderLineItems.map(item => item.toJSON()),
      ownSummary: this.#ownSummary.toJSON(),
      hierarchySummary: this.#hierarchySummary.toJSON(),
      tipProviderSummary: this.#tipProviderSummary.toJSON(),
      totalProvision: this.totalProvision,
      excludedEntryCount: this.#excludedEntryCount,
    };
  }

  static fromJSON(json) {
    if (!json) return null;

    const { EmployeeDetails } = require('../value-objects/EmployeeDetails.js');
    const { ReportPeriod } = require('../value-objects/ReportPeriod.js');
    const { ReportLineItem } = require('./ReportLineItem.js');

    return new BillingReport({
      id: json.id,
      employeeDetails: EmployeeDetails.fromJSON(json.employeeDetails),
      period: ReportPeriod.fromJSON(json.period),
      metadata: ReportMetadata.fromJSON(json.metadata),
      ownLineItems: (json.ownLineItems || []).map(item => ReportLineItem.fromJSON(item)),
      hierarchyLineItems: (json.hierarchyLineItems || []).map(item => ReportLineItem.fromJSON(item)),
      tipProviderLineItems: (json.tipProviderLineItems || []).map(item => ReportLineItem.fromJSON(item)),
      excludedEntryCount: json.excludedEntryCount || 0,
    });
  }

  static create({
    employeeDetails,
    period,
    ownLineItems = [],
    hierarchyLineItems = [],
    tipProviderLineItems = [],
    excludedEntryCount = 0,
    generatedBy = null,
    generatedByName = null,
  }) {
    return new BillingReport({
      employeeDetails,
      period,
      metadata: ReportMetadata.create(generatedBy, generatedByName),
      ownLineItems,
      hierarchyLineItems,
      tipProviderLineItems,
      excludedEntryCount,
    });
  }
}
