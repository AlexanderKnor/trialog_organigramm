/**
 * Entity: RevenueEntry
 * Core domain entity representing a revenue entry for an employee.
 * Supports N tip providers per entry (multi-Tippgeber).
 */

import { generateUUID } from '../../../../core/utils/index.js';
import { ValidationError } from '../../../../core/errors/index.js';
import { RevenueCategory } from '../value-objects/RevenueCategory.js';
import { RevenueStatus, REVENUE_STATUS_TYPES } from '../value-objects/RevenueStatus.js';
import { Product } from '../value-objects/Product.js';
import { ProductProvider } from '../value-objects/ProductProvider.js';
import { CustomerAddress } from '../value-objects/CustomerAddress.js';
import { TipProviderAllocation } from '../value-objects/TipProviderAllocation.js';

export class RevenueEntry {
  #id;
  #employeeId;
  #customerNumber;
  #customerName;
  #customerAddress;
  #category;
  #provisionType;
  #product;
  #productProvider;
  #propertyAddress;
  #contractNumber;
  #provisionAmount;
  #notes;
  #status;
  #entryDate;
  #createdAt;
  #updatedAt;
  #ownerProvisionSnapshot;
  #managerProvisionSnapshot;
  #hierarchySnapshot;
  #tipProviders; // Array<TipProviderAllocation>
  #hasVAT;
  #vatRate;
  #source;
  #sourceReference;

  constructor({
    id = null,
    employeeId,
    customerNumber,
    customerName,
    customerAddress = null,
    category,
    provisionType = null,
    product,
    productProvider,
    propertyAddress = null,
    contractNumber,
    provisionAmount,
    notes = '',
    status = null,
    entryDate = null,
    createdAt = null,
    updatedAt = null,
    ownerProvisionSnapshot = null,
    managerProvisionSnapshot = null,
    hierarchySnapshot = null,
    // Multi-tip-provider (new format)
    tipProviders = null,
    // Legacy single-tip-provider fields (backward compatibility)
    tipProviderId = null,
    tipProviderName = null,
    tipProviderProvisionPercentage = null,
    tipProviderProvisionSnapshot = null,
    hasVAT = false,
    vatRate = 19,
    source = null,
    sourceReference = null,
  }) {
    this.#id = id || generateUUID();
    this.#employeeId = employeeId;
    this.#customerNumber = customerNumber;
    this.#customerName = customerName;
    this.#customerAddress =
      customerAddress instanceof CustomerAddress
        ? customerAddress
        : new CustomerAddress(customerAddress || {});
    this.#category =
      category instanceof RevenueCategory
        ? category
        : new RevenueCategory(category);
    this.#provisionType = provisionType || this.#inferProvisionType(this.#category.type);
    this.#product =
      product instanceof Product ? product : Product.fromJSON(product);
    this.#productProvider =
      productProvider instanceof ProductProvider
        ? productProvider
        : ProductProvider.fromJSON(productProvider);
    this.#propertyAddress = propertyAddress;
    this.#contractNumber = contractNumber;
    this.#provisionAmount = provisionAmount;
    this.#notes = notes;
    this.#status =
      status instanceof RevenueStatus
        ? status
        : new RevenueStatus(status || REVENUE_STATUS_TYPES.SUBMITTED);
    this.#entryDate = this.#safeParseDate(entryDate) || new Date();
    this.#createdAt = this.#safeParseDate(createdAt) || new Date();
    this.#updatedAt = this.#safeParseDate(updatedAt) || new Date();

    // Provision Snapshots - captured at creation time for immutability
    this.#ownerProvisionSnapshot = ownerProvisionSnapshot;
    this.#managerProvisionSnapshot = managerProvisionSnapshot;
    this.#hierarchySnapshot = hierarchySnapshot || null;

    // Tip Providers (Tippgeber) - Multi-provider support
    this.#tipProviders = this.#buildTipProviders({
      tipProviders,
      tipProviderId,
      tipProviderName,
      tipProviderProvisionPercentage,
    });
    this.#validateTipProviders(this.#tipProviders, employeeId);

    // VAT (Umsatzsteuer) - Net/Gross calculation
    this.#hasVAT = Boolean(hasVAT);
    this.#vatRate = this.#validateVATRate(vatRate);

    // Source tracking for import duplicate detection
    this.#source = source ?? null;
    this.#sourceReference = sourceReference ?? null;
  }

  /**
   * Build tip providers array from either new format or legacy single fields
   */
  #buildTipProviders({ tipProviders, tipProviderId, tipProviderName, tipProviderProvisionPercentage }) {
    // New format: array of tip provider allocations
    if (Array.isArray(tipProviders) && tipProviders.length > 0) {
      return tipProviders.map((tp) =>
        tp instanceof TipProviderAllocation
          ? tp
          : TipProviderAllocation.fromJSON(tp),
      );
    }

    // Legacy format: single tip provider fields -> convert to single-element array
    if (tipProviderId) {
      return [
        new TipProviderAllocation({
          id: tipProviderId,
          name: tipProviderName || tipProviderId,
          provisionPercentage: tipProviderProvisionPercentage ?? 0,
        }),
      ];
    }

    // No tip providers
    return [];
  }

  /**
   * Validate tip providers array
   */
  #validateTipProviders(tipProviders, employeeId) {
    const seenIds = new Set();
    for (const tp of tipProviders) {
      // No self-assignment
      if (tp.id === employeeId) {
        throw new ValidationError('Tip provider cannot be the same as the entry owner', 'tipProviderId');
      }
      // No duplicate IDs
      if (seenIds.has(tp.id)) {
        throw new ValidationError(`Duplicate tip provider ID: ${tp.id}`, 'tipProviders');
      }
      seenIds.add(tp.id);
    }

    // Sum must not exceed 100%
    const totalPct = tipProviders.reduce((sum, tp) => sum + tp.provisionPercentage, 0);
    if (totalPct > 100) {
      throw new ValidationError(
        `Total tip provider provision (${totalPct}%) exceeds 100%`,
        'tipProviders',
      );
    }
  }

  #safeParseDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  #validateVATRate(rate) {
    if (rate === null || rate === undefined) {
      return 19;
    }

    const num = parseFloat(rate);
    if (isNaN(num)) {
      throw new ValidationError('VAT rate must be a number', 'vatRate');
    }

    if (num < 0 || num > 100) {
      throw new ValidationError('VAT rate must be between 0 and 100', 'vatRate');
    }

    return num;
  }

  // === Core Getters ===

  get id() { return this.#id; }
  get employeeId() { return this.#employeeId; }
  get customerNumber() { return this.#customerNumber; }
  get customerName() { return this.#customerName; }
  get customerAddress() { return this.#customerAddress; }
  get category() { return this.#category; }
  get provisionType() { return this.#provisionType; }
  get product() { return this.#product; }
  get productProvider() { return this.#productProvider; }
  get propertyAddress() { return this.#propertyAddress; }
  get contractNumber() { return this.#contractNumber; }
  get provisionAmount() { return this.#provisionAmount; }
  get notes() { return this.#notes; }
  get status() { return this.#status; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }
  get entryDate() { return this.#entryDate; }
  get ownerProvisionSnapshot() { return this.#ownerProvisionSnapshot; }
  get managerProvisionSnapshot() { return this.#managerProvisionSnapshot; }
  get hierarchySnapshot() { return this.#hierarchySnapshot; }

  get hasProvisionSnapshot() {
    return this.#ownerProvisionSnapshot !== null && this.#ownerProvisionSnapshot !== undefined;
  }

  // === Multi-Tip-Provider Getters ===

  /** Defensive copy of the tip providers array */
  get tipProviders() {
    return [...this.#tipProviders];
  }

  /** Flat array of tip provider IDs (for Firestore array-contains queries) */
  get tipProviderIds() {
    return this.#tipProviders.map((tp) => tp.id);
  }

  /** Whether this entry has at least one tip provider */
  get hasTipProvider() {
    return this.#tipProviders.length > 0;
  }

  /** Sum of all tip provider provision percentages */
  get totalTipProviderPercentage() {
    return this.#tipProviders.reduce((sum, tp) => sum + tp.provisionPercentage, 0);
  }

  /** Sum of all individual tip provider provision amounts */
  get tipProviderProvisionAmount() {
    return this.#tipProviders.reduce(
      (sum, tp) => sum + tp.calculateAmount(this.grossAmount),
      0,
    );
  }

  /** Owner's effective provision after all tip provider deductions */
  get ownerProvisionAfterTipProvider() {
    if (!this.#ownerProvisionSnapshot) {
      return 0;
    }
    return Math.max(0, this.#ownerProvisionSnapshot - this.totalTipProviderPercentage);
  }

  // === Backward-Compatibility Getters (legacy single-tip-provider) ===

  /** First tip provider ID or null (backward compat) */
  get tipProviderId() {
    return this.#tipProviders.length > 0 ? this.#tipProviders[0].id : null;
  }

  /** First tip provider name or null (backward compat) */
  get tipProviderName() {
    return this.#tipProviders.length > 0 ? this.#tipProviders[0].name : null;
  }

  /**
   * Total tip provider percentage (backward compat).
   * Used by cascade calculations that expect a single percentage value.
   */
  get tipProviderProvisionPercentage() {
    return this.totalTipProviderPercentage || null;
  }

  /** Not stored per-provider anymore - returns null */
  get tipProviderProvisionSnapshot() {
    return null;
  }

  // === VAT Getters ===

  get hasVAT() { return this.#hasVAT; }
  get vatRate() { return this.#vatRate; }

  get netAmount() {
    return this.#provisionAmount;
  }

  get vatAmount() {
    if (!this.#hasVAT) return 0;
    return Math.round(this.#provisionAmount * (this.#vatRate / 100) * 100) / 100;
  }

  get grossAmount() {
    if (!this.#hasVAT) return this.#provisionAmount;
    return Math.round((this.#provisionAmount + this.vatAmount) * 100) / 100;
  }

  // === Source ===

  get source() { return this.#source; }
  get sourceReference() { return this.#sourceReference; }

  // === Derived ===

  get requiresPropertyAddress() {
    return ProductProvider.requiresFreeTextProvider(this.#category.type);
  }

  get providerDisplayText() {
    if (this.requiresPropertyAddress && this.#propertyAddress) {
      return this.#propertyAddress;
    }
    return this.#productProvider.name;
  }

  get isComplete() {
    return (
      this.#customerName &&
      this.#customerAddress.isComplete &&
      this.#contractNumber &&
      this.#provisionAmount >= 0 &&
      (!this.requiresPropertyAddress || this.#propertyAddress)
    );
  }

  #inferProvisionType(categoryType) {
    const CATEGORY_TO_PROVISION = {
      bank: 'bank',
      insurance: 'insurance',
      realEstate: 'realEstate',
      propertyManagement: 'realEstate',
      energyContracts: 'bank',
    };
    return CATEGORY_TO_PROVISION[categoryType] || 'bank';
  }

  update(updates) {
    if (updates.customerName !== undefined) {
      this.#customerName = updates.customerName;
    }
    if (updates.customerAddress !== undefined) {
      this.#customerAddress =
        updates.customerAddress instanceof CustomerAddress
          ? updates.customerAddress
          : new CustomerAddress(updates.customerAddress);
    }
    if (updates.category !== undefined) {
      this.#category =
        updates.category instanceof RevenueCategory
          ? updates.category
          : new RevenueCategory(updates.category);
    }
    if (updates.provisionType !== undefined) {
      this.#provisionType = updates.provisionType;
    }
    if (updates.product !== undefined) {
      this.#product =
        updates.product instanceof Product
          ? updates.product
          : Product.fromJSON(updates.product);
    }
    if (updates.productProvider !== undefined) {
      this.#productProvider =
        updates.productProvider instanceof ProductProvider
          ? updates.productProvider
          : ProductProvider.fromJSON(updates.productProvider);
    }
    if (updates.propertyAddress !== undefined) {
      this.#propertyAddress = updates.propertyAddress;
    }
    if (updates.contractNumber !== undefined) {
      this.#contractNumber = updates.contractNumber;
    }
    if (updates.provisionAmount !== undefined) {
      this.#provisionAmount = updates.provisionAmount;
    }
    if (updates.notes !== undefined) {
      this.#notes = updates.notes;
    }
    if (updates.status !== undefined) {
      this.#status =
        updates.status instanceof RevenueStatus
          ? updates.status
          : new RevenueStatus(updates.status);
    }
    if (updates.entryDate !== undefined) {
      this.#entryDate = new Date(updates.entryDate);
    }

    // Tip Providers - new multi-provider format
    if (updates.tipProviders !== undefined) {
      this.#tipProviders = this.#buildTipProviders({
        tipProviders: updates.tipProviders,
        tipProviderId: null,
        tipProviderName: null,
        tipProviderProvisionPercentage: null,
      });
      this.#validateTipProviders(this.#tipProviders, this.#employeeId);
    }
    // Legacy single tip provider fields (backward compat for update)
    else if (updates.tipProviderId !== undefined) {
      this.#tipProviders = this.#buildTipProviders({
        tipProviders: null,
        tipProviderId: updates.tipProviderId,
        tipProviderName: updates.tipProviderName ?? null,
        tipProviderProvisionPercentage: updates.tipProviderProvisionPercentage ?? null,
      });
      this.#validateTipProviders(this.#tipProviders, this.#employeeId);
    }

    // VAT fields
    if (updates.hasVAT !== undefined) {
      this.#hasVAT = Boolean(updates.hasVAT);
    }
    if (updates.vatRate !== undefined) {
      this.#vatRate = this.#validateVATRate(updates.vatRate);
    }

    this.#updatedAt = new Date();

    return this;
  }

  toJSON() {
    // Serialize tip providers in both new and legacy formats for backward compatibility
    const tipProvidersJSON = this.#tipProviders.map((tp) => tp.toJSON());
    const firstTp = this.#tipProviders.length > 0 ? this.#tipProviders[0] : null;

    return {
      id: this.#id,
      employeeId: this.#employeeId,
      customerNumber: this.#customerNumber,
      customerName: this.#customerName,
      customerAddress: this.#customerAddress.toJSON(),
      category: this.#category.type,
      provisionType: this.#provisionType,
      product: this.#product.toJSON(),
      productProvider: this.#productProvider.toJSON(),
      propertyAddress: this.#propertyAddress,
      contractNumber: this.#contractNumber,
      provisionAmount: this.#provisionAmount,
      notes: this.#notes,
      status: this.#status.toJSON(),
      entryDate: this.#entryDate.toISOString(),
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
      // Provision snapshots for immutability
      ownerProvisionSnapshot: this.#ownerProvisionSnapshot,
      managerProvisionSnapshot: this.#managerProvisionSnapshot,
      hierarchySnapshot: this.#hierarchySnapshot,
      // Multi-Tip-Provider (new format)
      tipProviders: tipProvidersJSON,
      tipProviderIds: this.tipProviderIds,
      // Legacy single-tip-provider (backward compat - write first provider)
      tipProviderId: firstTp?.id ?? null,
      tipProviderName: firstTp?.name ?? null,
      tipProviderProvisionPercentage: this.totalTipProviderPercentage || null,
      tipProviderProvisionSnapshot: null,
      // VAT (Umsatzsteuer)
      hasVAT: this.#hasVAT,
      vatRate: this.#vatRate,
      // Source tracking for import duplicate detection
      source: this.#source,
      sourceReference: this.#sourceReference,
    };
  }

  static fromJSON(json) {
    // Determine tip providers: prefer new format, fall back to legacy
    let tipProviders = null;
    if (Array.isArray(json.tipProviders) && json.tipProviders.length > 0) {
      tipProviders = json.tipProviders;
    }

    return new RevenueEntry({
      id: json.id,
      employeeId: json.employeeId,
      customerNumber: json.customerNumber,
      customerName: json.customerName,
      customerAddress: json.customerAddress
        ? CustomerAddress.fromJSON(json.customerAddress)
        : null,
      category: json.category,
      provisionType: json.provisionType || null,
      product: json.product,
      productProvider: json.productProvider,
      propertyAddress: json.propertyAddress,
      contractNumber: json.contractNumber,
      provisionAmount: json.provisionAmount,
      notes: json.notes,
      status: json.status,
      entryDate: json.entryDate,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      // Provision snapshots (may be null for legacy entries)
      ownerProvisionSnapshot: json.ownerProvisionSnapshot ?? null,
      managerProvisionSnapshot: json.managerProvisionSnapshot ?? null,
      hierarchySnapshot: json.hierarchySnapshot ?? null,
      // Multi-tip-provider (new format takes priority)
      tipProviders: tipProviders,
      // Legacy single tip provider (used as fallback if tipProviders is null)
      tipProviderId: tipProviders ? null : (json.tipProviderId ?? null),
      tipProviderName: tipProviders ? null : (json.tipProviderName ?? null),
      tipProviderProvisionPercentage: tipProviders ? null : (json.tipProviderProvisionPercentage ?? null),
      // VAT (default: false, 19%)
      hasVAT: json.hasVAT ?? false,
      vatRate: json.vatRate ?? 19,
      // Source tracking (may be null for legacy/manual entries)
      source: json.source ?? null,
      sourceReference: json.sourceReference ?? null,
    });
  }
}
