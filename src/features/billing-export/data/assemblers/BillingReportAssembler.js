/**
 * Assembler: BillingReportAssembler
 * Transforms revenue data into billing report structures
 */

import { EmployeeDetails } from '../../domain/value-objects/EmployeeDetails.js';
import { ReportLineItem, LINE_ITEM_SOURCES } from '../../domain/entities/ReportLineItem.js';
import { BillingReport } from '../../domain/entities/BillingReport.js';
import { REVENUE_STATUS_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueStatus.js';
import { BillingExclusionRule } from '../../domain/value-objects/BillingExclusionRule.js';
import { roundCurrency } from '../../../../core/utils/index.js';

export class BillingReportAssembler {
  static createEmployeeDetails(user, hierarchyNode = null) {
    return EmployeeDetails.fromUser(user, hierarchyNode);
  }

  static createEmployeeDetailsFromNode(hierarchyNode) {
    return EmployeeDetails.fromHierarchyNode(hierarchyNode);
  }

  static createOwnLineItem(entry, employeeDetails) {
    const provisionPercentage = BillingReportAssembler.#getEffectiveOwnerProvision(entry, employeeDetails);
    const provisionAmount = roundCurrency((entry.grossAmount || entry.provisionAmount || 0) * (provisionPercentage / 100));
    const { provisionVatRate, provisionVatAmount, provisionGrossAmount } =
      BillingReportAssembler.#calculateProvisionVat(provisionAmount, employeeDetails, entry.hasVAT, entry.vatRate);

    return new ReportLineItem({
      originalEntryId: entry.id,
      date: entry.entryDate || entry.createdAt,
      customerName: entry.customerName,
      customerAddress: BillingReportAssembler.#formatCustomerAddress(entry.customerAddress),
      categoryType: entry.category?.type || entry.category,
      categoryDisplayName: entry.category?.displayName || entry.category?.toString() || '',
      productName: entry.product?.name || '',
      providerName: entry.productProvider?.name || entry.propertyAddress || '',
      contractNumber: entry.contractNumber || '',
      netAmount: entry.netAmount || entry.provisionAmount || 0,
      vatRate: entry.hasVAT ? (entry.vatRate || 19) : 0,
      vatAmount: entry.vatAmount || 0,
      grossAmount: entry.grossAmount || entry.provisionAmount || 0,
      provisionPercentage,
      provisionAmount,
      provisionVatRate,
      provisionVatAmount,
      provisionGrossAmount,
      source: LINE_ITEM_SOURCES.OWN,
      subordinateName: null,
      subordinateId: null,
      status: entry.status?.type || entry.status,
    });
  }

  static createHierarchyLineItem(hierarchicalEntry, employeeDetails) {
    const entry = hierarchicalEntry.originalEntry;
    const provisionPercentage = hierarchicalEntry.managerProvisionPercentage || 0;
    const provisionAmount = hierarchicalEntry.managerProvisionAmount || 0;
    const { provisionVatRate, provisionVatAmount, provisionGrossAmount } =
      BillingReportAssembler.#calculateProvisionVat(provisionAmount, employeeDetails, entry.hasVAT, entry.vatRate);

    return new ReportLineItem({
      originalEntryId: entry.id,
      date: entry.entryDate || entry.createdAt,
      customerName: entry.customerName,
      customerAddress: BillingReportAssembler.#formatCustomerAddress(entry.customerAddress),
      categoryType: entry.category?.type || entry.category,
      categoryDisplayName: entry.category?.displayName || entry.category?.toString() || '',
      productName: entry.product?.name || '',
      providerName: entry.productProvider?.name || entry.propertyAddress || '',
      contractNumber: entry.contractNumber || '',
      netAmount: entry.netAmount || entry.provisionAmount || 0,
      vatRate: entry.hasVAT ? (entry.vatRate || 19) : 0,
      vatAmount: entry.vatAmount || 0,
      grossAmount: entry.grossAmount || entry.provisionAmount || 0,
      provisionPercentage,
      provisionAmount,
      provisionVatRate,
      provisionVatAmount,
      provisionGrossAmount,
      source: LINE_ITEM_SOURCES.HIERARCHY,
      subordinateName: hierarchicalEntry.owner?.name || '',
      subordinateId: hierarchicalEntry.owner?.id || '',
      status: entry.status?.type || entry.status,
    });
  }

  static createTipProviderLineItem(entry, tipProviderId, employeeDetails) {
    // Find this specific tip provider's allocation from the tipProviders array
    const allocation = (entry.tipProviders || []).find((tp) => tp.id === tipProviderId);
    const provisionPercentage = allocation
      ? allocation.provisionPercentage
      : (entry.tipProviderProvisionPercentage || 0);

    // VAT-exempt tip providers (Kleinunternehmer / nicht umsatzsteuerpflichtig):
    // provision is calculated on net amount — they cannot charge or offset VAT.
    // VAT-liable tip providers: provision is calculated on gross, then VAT is extracted.
    const isVatExempt = employeeDetails?.isVatExempt ?? false;
    const baseAmount = (entry.hasVAT && isVatExempt)
      ? (entry.netAmount || entry.provisionAmount)
      : (entry.grossAmount || entry.provisionAmount);

    const provisionAmount = allocation
      ? allocation.calculateAmount(baseAmount)
      : (entry.tipProviderProvisionAmount || 0);
    const { provisionVatRate, provisionVatAmount, provisionGrossAmount } =
      BillingReportAssembler.#calculateProvisionVat(provisionAmount, employeeDetails, entry.hasVAT, entry.vatRate);

    const ownerName = entry.hierarchySnapshot?.ownerName ||
                     entry.employeeId ||
                     'Unbekannt';

    return new ReportLineItem({
      originalEntryId: entry.id,
      date: entry.entryDate || entry.createdAt,
      customerName: entry.customerName,
      customerAddress: BillingReportAssembler.#formatCustomerAddress(entry.customerAddress),
      categoryType: entry.category?.type || entry.category,
      categoryDisplayName: entry.category?.displayName || entry.category?.toString() || '',
      productName: entry.product?.name || '',
      providerName: entry.productProvider?.name || entry.propertyAddress || '',
      contractNumber: entry.contractNumber || '',
      netAmount: entry.netAmount || entry.provisionAmount || 0,
      vatRate: entry.hasVAT ? (entry.vatRate || 19) : 0,
      vatAmount: entry.vatAmount || 0,
      grossAmount: entry.grossAmount || entry.provisionAmount || 0,
      provisionPercentage,
      provisionAmount,
      provisionVatRate,
      provisionVatAmount,
      provisionGrossAmount,
      source: LINE_ITEM_SOURCES.TIP_PROVIDER,
      subordinateName: ownerName,
      subordinateId: entry.employeeId,
      status: entry.status?.type || entry.status,
    });
  }

  static assembleReport({
    employeeDetails,
    period,
    ownEntries = [],
    hierarchyEntries = [],
    tipProviderEntries = [],
    generatedBy = null,
    generatedByName = null,
    includeProvisioned = false,
  }) {
    // Step 1a: Filter OWN entries by status + period eligibility
    const filterOwnByStatusAndPeriod = (entries) => {
      return entries.filter(entry => {
        const sourceEntry = entry.originalEntry || entry;
        const status = sourceEntry.status?.type || sourceEntry.status;
        const entryDate = new Date(sourceEntry.entryDate || sourceEntry.createdAt);

        // TRANSFERRED (not yet billed): carry forward — include if entryDate <= period end
        if (status === REVENUE_STATUS_TYPES.TRANSFERRED) {
          return entryDate <= period.endDate;
        }
        // PROVISIONED (reprint mode): only within exact period
        if (includeProvisioned && status === REVENUE_STATUS_TYPES.PROVISIONED) {
          return period.containsDate(entryDate);
        }
        // All other statuses: not eligible
        return false;
      });
    };

    // Step 1b: Filter HIERARCHY and TIP PROVIDER entries by status + period.
    // The entry status reflects the OWNER's billing state — PROVISIONED means the
    // owner was already billed, but managers and tip providers may not have been.
    // Uses per-recipient tracking arrays to prevent double-billing.
    const recipientId = employeeDetails.id;

    const filterRelatedByStatusAndPeriod = (entries, isBilledForRecipient) => {
      return entries.filter(entry => {
        const sourceEntry = entry.originalEntry || entry;
        const status = sourceEntry.status?.type || sourceEntry.status;
        const entryDate = new Date(sourceEntry.entryDate || sourceEntry.createdAt);

        // Cancelled/rejected entries are never eligible
        if (status === REVENUE_STATUS_TYPES.CANCELLED || status === REVENUE_STATUS_TYPES.REJECTED) {
          return false;
        }
        // TRANSFERRED or PROVISIONED: eligible for billing
        if (status === REVENUE_STATUS_TYPES.TRANSFERRED || status === REVENUE_STATUS_TYPES.PROVISIONED) {
          // Skip if already billed for this recipient (unless reprint mode)
          if (!includeProvisioned && isBilledForRecipient(sourceEntry)) {
            return false;
          }
          return entryDate <= period.endDate;
        }
        // SUBMITTED: not yet approved for billing
        return false;
      });
    };

    // Step 2: Apply BillingExclusionRule to eligible entries
    const filterByExclusionRule = (entries) => {
      return entries.filter(entry =>
        !BillingExclusionRule.shouldExcludeEntry(entry, employeeDetails.hasDirectPaymentGewo),
      );
    };

    const eligibleOwnEntries = filterOwnByStatusAndPeriod(ownEntries);
    const eligibleHierarchyEntries = filterRelatedByStatusAndPeriod(
      hierarchyEntries,
      (entry) => entry.isBilledForHierarchyManager?.(recipientId) ?? false,
    );
    const eligibleTipProviderEntries = filterRelatedByStatusAndPeriod(
      tipProviderEntries,
      (entry) => entry.isBilledForTipProvider?.(recipientId) ?? false,
    );

    // BillingExclusionRule only applies to OWN entries.
    // Tip provider and hierarchy provisions are paid by Trialog regardless of
    // the entry's direct-payment status or the recipient's GewO qualifications.
    const activeOwnEntries = filterByExclusionRule(eligibleOwnEntries);
    const activeHierarchyEntries = eligibleHierarchyEntries;
    const activeTipProviderEntries = eligibleTipProviderEntries;

    // excludedEntryCount: only own entries excluded by BillingExclusionRule
    const excludedEntryCount = eligibleOwnEntries.length - activeOwnEntries.length;

    const ownLineItems = activeOwnEntries.map(entry =>
      BillingReportAssembler.createOwnLineItem(entry, employeeDetails)
    );

    const hierarchyLineItems = activeHierarchyEntries.map(entry =>
      BillingReportAssembler.createHierarchyLineItem(entry, employeeDetails)
    );

    const tipProviderLineItems = activeTipProviderEntries.map(entry =>
      BillingReportAssembler.createTipProviderLineItem(entry, employeeDetails.id, employeeDetails)
    );

    return BillingReport.create({
      employeeDetails,
      period,
      ownLineItems,
      hierarchyLineItems,
      tipProviderLineItems,
      excludedEntryCount,
      generatedBy,
      generatedByName,
    });
  }

  /**
   * Create a line item for an extraordinary entry (Durchlaufposten).
   * 100% of the gross amount flows through — no provision percentage applied.
   */
  static createExtraordinaryLineItem(entry, gfDetails) {
    const grossAmount = entry.grossAmount || entry.provisionAmount || 0;
    const { provisionVatRate, provisionVatAmount, provisionGrossAmount } =
      BillingReportAssembler.#calculateProvisionVat(grossAmount, gfDetails, entry.hasVAT, entry.vatRate);

    // Target employee name from hierarchy snapshot
    const targetEmployeeName = entry.hierarchySnapshot?.ownerName || entry.employeeId || 'Unbekannt';

    return new ReportLineItem({
      originalEntryId: entry.id,
      date: entry.entryDate || entry.createdAt,
      customerName: entry.customerName,
      customerAddress: BillingReportAssembler.#formatCustomerAddress(entry.customerAddress),
      categoryType: entry.category?.type || entry.category,
      categoryDisplayName: entry.category?.displayName || entry.category?.toString() || '',
      productName: entry.product?.name || '',
      providerName: entry.productProvider?.name || entry.propertyAddress || '',
      contractNumber: entry.contractNumber || '',
      netAmount: entry.netAmount || entry.provisionAmount || 0,
      vatRate: entry.hasVAT ? (entry.vatRate || 19) : 0,
      vatAmount: entry.vatAmount || 0,
      grossAmount,
      provisionPercentage: 100,
      provisionAmount: grossAmount,
      provisionVatRate,
      provisionVatAmount,
      provisionGrossAmount,
      source: LINE_ITEM_SOURCES.EXTRAORDINARY,
      subordinateName: targetEmployeeName,
      subordinateId: entry.employeeId,
      status: entry.status?.type || entry.status,
    });
  }

  /**
   * Assemble a complete extraordinary report (Durchlaufposten-Abrechnung).
   * Only includes SUBMITTED entries. No status change on finalization.
   */
  static assembleExtraordinaryReport({
    gfDetails,
    period,
    entries = [],
    generatedBy = null,
    generatedByName = null,
  }) {
    // TRANSFERRED entries: carry forward — include if entryDate <= period end
    const activeEntries = entries.filter(entry => {
      const status = entry.status?.type || entry.status;
      if (status !== REVENUE_STATUS_TYPES.TRANSFERRED) return false;

      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return entryDate <= period.endDate;
    });

    const excludedEntryCount = entries.length - activeEntries.length;

    const extraordinaryLineItems = activeEntries.map(entry =>
      BillingReportAssembler.createExtraordinaryLineItem(entry, gfDetails),
    );

    return BillingReport.create({
      employeeDetails: gfDetails,
      period,
      ownLineItems: extraordinaryLineItems,
      hierarchyLineItems: [],
      tipProviderLineItems: [],
      excludedEntryCount,
      generatedBy,
      generatedByName,
      reportType: 'extraordinary',
    });
  }

  static #calculateProvisionVat(provisionAmount, employeeDetails, revenueHasVat, revenueVatRate) {
    const isVatExempt = employeeDetails?.isVatExempt ?? false;

    // Only extract VAT if: revenue itself has VAT AND employee is VAT-liable
    if (!revenueHasVat || isVatExempt) {
      return { provisionVatRate: 0, provisionVatAmount: 0, provisionGrossAmount: provisionAmount };
    }

    // The provision was calculated from gross revenue (VAT already baked in) → extract it
    const vatRate = revenueVatRate || 19;
    const provisionNetAmount = roundCurrency(provisionAmount / (1 + vatRate / 100));
    const provisionVatAmount = roundCurrency(provisionAmount - provisionNetAmount);

    return { provisionVatRate: vatRate, provisionVatAmount, provisionGrossAmount: provisionAmount };
  }

  static #getEffectiveOwnerProvision(entry, employeeDetails) {
    let baseProvision = 0;

    if (entry.hasProvisionSnapshot && entry.ownerProvisionSnapshot !== null) {
      baseProvision = entry.ownerProvisionSnapshot;
    } else if (employeeDetails) {
      const provisionType = entry.provisionType || BillingReportAssembler.#inferProvisionType(entry.category?.type);
      baseProvision = employeeDetails.getProvisionRate(provisionType);
    }

    const tipProviderDeduction = Math.min(entry.totalTipProviderPercentage || 0, baseProvision);
    return baseProvision - tipProviderDeduction;
  }

  static #inferProvisionType(categoryType) {
    const CATEGORY_TO_PROVISION = {
      bank: 'bank',
      insurance: 'insurance',
      realEstate: 'realEstate',
      propertyManagement: 'realEstate',
      energyContracts: 'bank',
    };
    return CATEGORY_TO_PROVISION[categoryType] || 'bank';
  }

  static #formatCustomerAddress(customerAddress) {
    if (!customerAddress) return '';

    if (typeof customerAddress === 'string') return customerAddress;

    const parts = [];
    if (customerAddress.street) {
      parts.push(customerAddress.houseNumber
        ? `${customerAddress.street} ${customerAddress.houseNumber}`
        : customerAddress.street
      );
    }
    if (customerAddress.postalCode || customerAddress.city) {
      parts.push(`${customerAddress.postalCode || ''} ${customerAddress.city || ''}`.trim());
    }

    return parts.join(', ');
  }
}
