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
   * Finalize a billing report by transitioning own TRANSFERRED entries to PROVISIONED.
   * Only own line items are transitioned (hierarchy/tip-provider entries belong to other employees).
   * Entries already PROVISIONED are skipped (re-run safe).
   * @param {BillingReport} report - The completed billing report
   * @returns {Promise<number>} Number of entries transitioned
   */
  async finalizeReport(report) {
    const transferredEntryIds = report.ownLineItems
      .filter(item => item.status === REVENUE_STATUS_TYPES.TRANSFERRED)
      .map(item => item.originalEntryId);

    if (transferredEntryIds.length === 0) {
      return 0;
    }

    await this.#revenueService.batchUpdateEntryStatus(
      transferredEntryIds,
      REVENUE_STATUS_TYPES.PROVISIONED,
    );

    Logger.log(`Finalized ${transferredEntryIds.length} entries (TRANSFERRED -> PROVISIONED)`);
    return transferredEntryIds.length;
  }
}
