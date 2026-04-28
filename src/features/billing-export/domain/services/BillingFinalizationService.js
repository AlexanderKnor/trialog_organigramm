/**
 * Domain Service: BillingFinalizationService
 * Transitions TRANSFERRED entries to PROVISIONED after billing export
 */

import { REVENUE_STATUS_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueStatus.js';
import { Logger } from '../../../../core/utils/logger.js';

export class BillingFinalizationService {
  #revenueService;

  constructor(revenueService) {
    this.#revenueService = revenueService;
  }

  /**
   * Finalize a billing report:
   * 1. Own TRANSFERRED entries → PROVISIONED
   * 2. Tip provider entries → mark recipientId in billedTipProviderIds
   * 3. Hierarchy entries → mark recipientId in billedHierarchyManagerIds
   * @param {BillingReport} report - The completed billing report
   * @returns {Promise<{ownCount: number, tipProviderCount: number, hierarchyCount: number}>}
   */
  async finalizeReport(report) {
    const employeeId = report.employeeDetails?.id;

    // 1. Own entries: TRANSFERRED → PROVISIONED (as before)
    const transferredEntryIds = report.ownLineItems
      .filter(item => item.status === REVENUE_STATUS_TYPES.TRANSFERRED)
      .map(item => item.originalEntryId);

    if (transferredEntryIds.length > 0) {
      await this.#revenueService.batchUpdateEntryStatus(
        transferredEntryIds,
        REVENUE_STATUS_TYPES.PROVISIONED,
      );
      Logger.log(`Finalized ${transferredEntryIds.length} own entries (TRANSFERRED -> PROVISIONED)`);
    }

    // 2. Tip provider entries: mark this employee as billed
    const tipProviderEntryIds = report.tipProviderLineItems
      .map(item => item.originalEntryId)
      .filter(Boolean);

    if (tipProviderEntryIds.length > 0 && employeeId) {
      await this.#revenueService.markEntriesAsBilledForTipProvider(
        tipProviderEntryIds, employeeId,
      );
      Logger.log(`Marked ${tipProviderEntryIds.length} entries as billed for tip provider: ${employeeId}`);
    }

    // 3. Hierarchy entries: mark this employee (manager) as billed
    const hierarchyEntryIds = report.hierarchyLineItems
      .map(item => item.originalEntryId)
      .filter(Boolean);

    if (hierarchyEntryIds.length > 0 && employeeId) {
      await this.#revenueService.markEntriesAsBilledForHierarchyManager(
        hierarchyEntryIds, employeeId,
      );
      Logger.log(`Marked ${hierarchyEntryIds.length} entries as billed for hierarchy manager: ${employeeId}`);
    }

    return {
      ownCount: transferredEntryIds.length,
      tipProviderCount: tipProviderEntryIds.length,
      hierarchyCount: hierarchyEntryIds.length,
    };
  }
}
