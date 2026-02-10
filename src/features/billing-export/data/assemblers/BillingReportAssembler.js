/**
 * Assembler: BillingReportAssembler
 * Transforms revenue data into billing report structures
 */

import { EmployeeDetails } from '../../domain/value-objects/EmployeeDetails.js';
import { ReportLineItem, LINE_ITEM_SOURCES } from '../../domain/entities/ReportLineItem.js';
import { BillingReport } from '../../domain/entities/BillingReport.js';
import { REVENUE_STATUS_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueStatus.js';

export class BillingReportAssembler {
  static createEmployeeDetails(user, hierarchyNode = null) {
    return EmployeeDetails.fromUser(user, hierarchyNode);
  }

  static createEmployeeDetailsFromNode(hierarchyNode) {
    return EmployeeDetails.fromHierarchyNode(hierarchyNode);
  }

  static createOwnLineItem(entry, employeeDetails) {
    const provisionPercentage = BillingReportAssembler.#getEffectiveOwnerProvision(entry, employeeDetails);
    const provisionAmount = Math.round((entry.grossAmount || entry.provisionAmount || 0) * (provisionPercentage / 100) * 100) / 100;
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
    const provisionAmount = allocation
      ? allocation.calculateAmount(entry.grossAmount || entry.provisionAmount)
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
  }) {
    const filterActiveEntries = (entries) => {
      return entries.filter(entry => {
        const status = entry.status?.type || entry.status ||
                      entry.originalEntry?.status?.type || entry.originalEntry?.status;
        return status !== REVENUE_STATUS_TYPES.REJECTED &&
               status !== REVENUE_STATUS_TYPES.CANCELLED;
      });
    };

    const activeOwnEntries = filterActiveEntries(ownEntries);
    const activeHierarchyEntries = filterActiveEntries(hierarchyEntries);
    const activeTipProviderEntries = filterActiveEntries(tipProviderEntries);

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
      generatedBy,
      generatedByName,
    });
  }

  static #calculateProvisionVat(provisionAmount, employeeDetails, revenueHasVat, revenueVatRate) {
    const isSmallBusiness = employeeDetails?.isSmallBusiness ?? false;

    // Only extract VAT if: revenue itself has VAT AND employee is not Kleinunternehmer
    if (!revenueHasVat || isSmallBusiness) {
      return { provisionVatRate: 0, provisionVatAmount: 0, provisionGrossAmount: provisionAmount };
    }

    // The provision was calculated from gross revenue (VAT already baked in) → extract it
    const vatRate = revenueVatRate || 19;
    const provisionNetAmount = Math.round((provisionAmount / (1 + vatRate / 100)) * 100) / 100;
    const provisionVatAmount = Math.round((provisionAmount - provisionNetAmount) * 100) / 100;

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
