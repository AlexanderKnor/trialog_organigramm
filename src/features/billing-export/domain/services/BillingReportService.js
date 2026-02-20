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

      Logger.log('Employee details loaded:', employeeDetails.name);

      const ownEntries = await this.#loadOwnEntries(employeeId, period);
      Logger.log('Own entries loaded:', ownEntries.length);

      let hierarchyEntries = [];
      if (includeHierarchy) {
        hierarchyEntries = await this.#loadHierarchyEntries(employeeId, period);
        Logger.log('Hierarchy entries loaded:', hierarchyEntries.length);
      }

      let tipProviderEntries = [];
      if (includeTipProvider) {
        tipProviderEntries = await this.#loadTipProviderEntries(employeeId, period);
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

  async #loadEmployeeDetails(employeeId) {
    let user = null;
    let hierarchyNode = null;

    if (this.#profileService) {
      try {
        const users = await this.#profileService.getAllUsers();
        user = users.find(u => u.linkedNodeId === employeeId || u.uid === employeeId);
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

  async #loadOwnEntries(employeeId, period) {
    const allEntries = await this.#revenueService.getEntriesByEmployee(employeeId);
    return this.#filterEntriesByPeriod(allEntries, period);
  }

  async #loadHierarchyEntries(employeeId, period) {
    try {
      const trees = await this.#hierarchyService.getAllTrees();
      if (trees.length === 0) return [];

      const tree = trees[0];
      const treeId = tree.id;

      if (!tree.hasNode(employeeId)) {
        return [];
      }

      const hierarchicalEntries = await this.#revenueService.getHierarchicalRevenues(
        employeeId,
        treeId
      );

      return this.#filterHierarchicalEntriesByPeriod(hierarchicalEntries, period);
    } catch (error) {
      Logger.warn('Failed to load hierarchy entries:', error);
      return [];
    }
  }

  async #loadTipProviderEntries(employeeId, period) {
    try {
      const entries = await this.#revenueService.getEntriesByTipProvider(employeeId);
      return this.#filterEntriesByPeriod(entries, period);
    } catch (error) {
      Logger.warn('Failed to load tip provider entries:', error);
      return [];
    }
  }

  #filterEntriesByPeriod(entries, period) {
    return entries.filter(entry => {
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return period.containsDate(entryDate);
    });
  }

  #filterHierarchicalEntriesByPeriod(entries, period) {
    return entries.filter(entry => {
      const originalEntry = entry.originalEntry;
      const entryDate = new Date(originalEntry.entryDate || originalEntry.createdAt);
      return period.containsDate(entryDate);
    });
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
