/**
 * Domain Service: BillingReportService
 * Orchestrates data loading and report generation
 */

import { Logger } from '../../../../core/utils/logger.js';
import { ReportPeriod } from '../value-objects/ReportPeriod.js';
import { BillingReportAssembler } from '../../data/assemblers/BillingReportAssembler.js';
import { isGeschaeftsfuehrerId, buildGeschaeftsfuehrerNode } from '../../../../core/config/geschaeftsfuehrer.config.js';

export class BillingReportService {
  #revenueService;
  #profileService;
  #hierarchyService;

  constructor(revenueService, profileService, hierarchyService) {
    this.#revenueService = revenueService;
    this.#profileService = profileService;
    this.#hierarchyService = hierarchyService;
  }

  async generateReport(employeeId, period, options = {}) {
    const {
      includeHierarchy = true,
      includeTipProvider = true,
      includeProvisioned = false,
      generatedBy = null,
      generatedByName = null,
    } = options;

    Logger.log('Generating billing report for employee:', employeeId);
    Logger.log('Period:', period.displayName);

    try {
      const employeeDetails = await this.#loadEmployeeDetails(employeeId);
      if (!employeeDetails) {
        throw new Error(`Employee ${employeeId} not found`);
      }

      if (!employeeDetails.isBillingReady) {
        const missing = employeeDetails.missingBillingFields.join(', ');
        throw new Error(
          `Abrechnung für "${employeeDetails.name}" nicht möglich. ` +
          `Fehlende Profildaten: ${missing}`,
        );
      }

      Logger.log('Employee details loaded:', employeeDetails.name);

      const ownEntries = await this.#loadOwnEntries(employeeId);
      Logger.log('Own entries loaded:', ownEntries.length);

      let hierarchyEntries = [];
      if (includeHierarchy) {
        hierarchyEntries = await this.#loadHierarchyEntries(employeeId);
        Logger.log('Hierarchy entries loaded:', hierarchyEntries.length);
      }

      let tipProviderEntries = [];
      if (includeTipProvider) {
        tipProviderEntries = await this.#loadTipProviderEntries(employeeId);
        Logger.log('Tip provider entries loaded:', tipProviderEntries.length);
      }

      const report = BillingReportAssembler.assembleReport({
        employeeDetails,
        period,
        ownEntries,
        hierarchyEntries,
        tipProviderEntries,
        generatedBy,
        generatedByName,
        includeProvisioned,
      });

      Logger.log('Report generated successfully');
      Logger.log('Total provisions:', report.totalProvision.toFixed(2));

      return report;
    } catch (error) {
      Logger.error('Failed to generate billing report:', error);
      throw error;
    }
  }

  async #loadOwnEntries(employeeId) {
    return await this.#revenueService.getEntriesByEmployee(employeeId);
  }

  async #loadHierarchyEntries(employeeId) {
    try {
      const trees = await this.#hierarchyService.getAllTrees();
      if (trees.length === 0) return [];

      const tree = trees[0];
      const treeId = tree.id;

      if (!tree.hasNode(employeeId)) {
        return [];
      }

      return await this.#revenueService.getHierarchicalRevenues(employeeId, treeId);
    } catch (error) {
      Logger.warn('Failed to load hierarchy entries:', error);
      return [];
    }
  }

  async #loadTipProviderEntries(employeeId) {
    try {
      return await this.#revenueService.getEntriesByTipProvider(employeeId);
    } catch (error) {
      Logger.warn('Failed to load tip provider entries:', error);
      return [];
    }
  }

  async #loadEmployeeDetails(employeeId) {
    let user = null;
    let hierarchyNode = null;

    if (this.#profileService) {
      try {
        const users = await this.#profileService.getAllUsers();
        user = users.find(u => u.linkedNodeId === employeeId || u.uid === employeeId);

        // Geschaeftsfuehrer: also try matching by email (their IDs are hardcoded, not Firebase UIDs)
        if (!user && isGeschaeftsfuehrerId(employeeId)) {
          const gfData = buildGeschaeftsfuehrerNode(employeeId);
          if (gfData?.email) {
            const gfEmail = gfData.email.toLowerCase();
            user = users.find(u => u.email?.toLowerCase() === gfEmail);
            if (user) {
              Logger.log(`✓ Geschaeftsfuehrer profile matched by email: ${gfEmail}`);
            }
          }
        }
      } catch (error) {
        Logger.warn('Failed to load user profile:', error);
      }
    }

    if (this.#hierarchyService) {
      try {
        const trees = await this.#hierarchyService.getAllTrees();
        if (trees.length > 0) {
          const tree = trees[0];
          if (tree.hasNode(employeeId)) {
            hierarchyNode = tree.getNode(employeeId);
          }
        }
      } catch (error) {
        Logger.warn('Failed to load hierarchy node:', error);
      }
    }

    if (isGeschaeftsfuehrerId(employeeId)) {
      const gfData = buildGeschaeftsfuehrerNode(employeeId);
      if (user) {
        return BillingReportAssembler.createEmployeeDetails(user, gfData);
      }
      return BillingReportAssembler.createEmployeeDetailsFromNode(gfData);
    }

    if (user) {
      return BillingReportAssembler.createEmployeeDetails(user, hierarchyNode);
    }

    if (hierarchyNode) {
      return BillingReportAssembler.createEmployeeDetailsFromNode(hierarchyNode);
    }

    return null;
  }

  #filterEntriesByPeriodEnd(entries, period) {
    return entries.filter(entry => {
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return entryDate <= period.endDate;
    });
  }

  /**
   * Generate extraordinary report (Durchlaufposten) for a Geschaeftsfuehrer.
   * No status transition — finalization happens in the target employee's billing.
   */
  async generateExtraordinaryReport(gfId, period, options = {}) {
    const {
      generatedBy = null,
      generatedByName = null,
    } = options;

    Logger.log('Generating extraordinary report for GF:', gfId);
    Logger.log('Period:', period.displayName);

    try {
      const gfDetails = await this.#loadEmployeeDetails(gfId);
      if (!gfDetails) {
        throw new Error(`Geschaeftsfuehrer ${gfId} not found`);
      }

      if (!gfDetails.isBillingReady) {
        const missing = gfDetails.missingBillingFields.join(', ');
        throw new Error(
          `Abrechnung für "${gfDetails.name}" nicht möglich. ` +
          `Fehlende Profildaten: ${missing}`,
        );
      }

      const allEntries = await this.#revenueService.getExtraordinaryEntriesByGf(gfId);

      Logger.log('Extraordinary entries total:', allEntries.length);

      const report = BillingReportAssembler.assembleExtraordinaryReport({
        gfDetails,
        period,
        entries: allEntries,
        generatedBy,
        generatedByName,
      });

      Logger.log('Extraordinary report generated successfully');
      return report;
    } catch (error) {
      Logger.error('Failed to generate extraordinary report:', error);
      throw error;
    }
  }

  static createPeriod(year, month) {
    return ReportPeriod.forMonth(year, month);
  }

  static createCurrentMonthPeriod() {
    return ReportPeriod.forCurrentMonth();
  }

  static createLastMonthPeriod() {
    return ReportPeriod.forLastMonth();
  }

  static createQuarterPeriod(year, quarter) {
    return ReportPeriod.forQuarter(year, quarter);
  }

  static createCurrentQuarterPeriod() {
    return ReportPeriod.forCurrentQuarter();
  }

  static createCustomPeriod(startDate, endDate) {
    return ReportPeriod.custom(startDate, endDate);
  }
}
