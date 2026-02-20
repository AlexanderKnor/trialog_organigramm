/**
 * Domain Service: RevenueService
 * Orchestrates domain operations for revenue tracking
 */

import { RevenueEntry } from '../entities/RevenueEntry.js';
import { HierarchicalRevenueEntry } from '../entities/HierarchicalRevenueEntry.js';
import { CompanyRevenueEntry } from '../entities/CompanyRevenueEntry.js';
import { REVENUE_STATUS_TYPES } from '../value-objects/RevenueStatus.js';
import { Logger } from './../../../../core/utils/logger.js';
import {
  GESCHAEFTSFUEHRER_IDS,
  isGeschaeftsfuehrerId,
  getGeschaeftsfuehrerConfig,
  buildGeschaeftsfuehrerNode,
} from '../../../../core/config/geschaeftsfuehrer.config.js';

export class RevenueService {
  #revenueRepository;
  #hierarchyService;
  #catalogService;

  constructor(revenueRepository, hierarchyService, catalogService = null) {
    this.#revenueRepository = revenueRepository;
    this.#hierarchyService = hierarchyService;
    this.#catalogService = catalogService;
  }

  async getEntriesByEmployee(employeeId) {
    return await this.#revenueRepository.findByEmployeeId(employeeId);
  }

  async getEntryById(entryId) {
    return await this.#revenueRepository.findById(entryId);
  }

  async addEntry(employeeId, entryData) {
    const customerNumber = await this.#revenueRepository.getNextCustomerNumber(
      employeeId,
    );

    // Capture provision snapshots from hierarchy at creation time
    const snapshots = await this.#captureProvisionSnapshots(employeeId, entryData);

    const entry = new RevenueEntry({
      ...entryData,
      employeeId,
      customerNumber,
      ...snapshots, // Add provision snapshots
    });

    await this.#revenueRepository.save(entry);
    return entry;
  }

  async updateEntry(entryId, updates) {
    const entry = await this.#revenueRepository.findById(entryId);
    entry.update(updates);
    await this.#revenueRepository.update(entry);
    return entry;
  }

  async updateEntryStatus(entryId, newStatus) {
    const entry = await this.#revenueRepository.findById(entryId);
    entry.update({ status: newStatus });
    await this.#revenueRepository.update(entry);
    return entry;
  }

  async batchUpdateEntryStatus(entryIds, newStatus) {
    if (!entryIds || entryIds.length === 0) return;

    if (!Object.values(REVENUE_STATUS_TYPES).includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const updates = entryIds.map(entryId => ({ entryId, status: newStatus }));
    await this.#revenueRepository.batchUpdateStatus(updates);

    Logger.log(`Batch updated ${updates.length} entries to status: ${newStatus}`);
  }

  async deleteEntry(entryId) {
    await this.#revenueRepository.delete(entryId);
  }

  async searchEntries(query) {
    return await this.#revenueRepository.search(query);
  }

  /**
   * Get all entries where the given employee is the tip provider
   */
  async getEntriesByTipProvider(tipProviderId) {
    return await this.#revenueRepository.findByTipProviderId(tipProviderId);
  }

  /**
   * Get tip provider revenue data for an employee
   * Returns entries where employee is tip provider with calculated amounts
   */
  async getTipProviderRevenues(tipProviderId) {
    const entries = await this.getEntriesByTipProvider(tipProviderId);

    return entries.map(entry => {
      const allocation = entry.tipProviders.find(tp => tp.id === tipProviderId);
      return {
        entry,
        tipProviderProvision: allocation ? allocation.provisionPercentage : 0,
        tipProviderAmount: allocation ? allocation.calculateAmount(entry.grossAmount || entry.provisionAmount) : 0,
      };
    });
  }

  async getHierarchicalRevenues(managerId, treeId) {
    const tree = await this.#hierarchyService.getTree(treeId);
    if (!tree || !tree.hasNode(managerId)) {
      return [];
    }

    const manager = tree.getNode(managerId);
    const hierarchicalEntries = [];

    const collectSubordinateEntries = async (node, level) => {
      const children = tree.getChildren(node.id);

      for (const child of children) {
        const entries = await this.#revenueRepository.findByEmployeeId(
          child.id,
        );

        for (const entry of entries) {
          const hierarchicalEntry = HierarchicalRevenueEntry.calculate({
            entry,
            owner: child,
            manager,
            hierarchyLevel: level,
          });

          if (hierarchicalEntry.hasManagerProvision) {
            hierarchicalEntries.push(hierarchicalEntry);
          }
        }

        await collectSubordinateEntries(child, level + 1);
      }
    };

    await collectSubordinateEntries(manager, 1);
    return hierarchicalEntries;
  }

  async getCompanyRevenues(companyId, treeId) {
    const tree = await this.#hierarchyService.getTree(treeId);
    if (!tree || !tree.hasNode(companyId)) {
      return [];
    }

    const company = tree.getNode(companyId);
    if (!company.isRoot) {
      return [];
    }

    const companyEntries = [];

    // Load direct company entries (company's own revenue, no cascade)
    const companyDirectEntries = await this.#revenueRepository.findByEmployeeId(companyId);
    for (const entry of companyDirectEntries) {
      const companyEntry = CompanyRevenueEntry.calculate({
        entry,
        entryOwner: company,
        directSubordinate: company,
        company,
        hierarchyPath: [company],
      });

      if (companyEntry.hasCompanyProvision) {
        companyEntries.push(companyEntry);
      }
    }

    // Get all employees in the organization (excluding root)
    const allEmployees = this.#getAllEmployeesRecursive(tree, companyId);

    // Add Geschäftsführer to the list
    const geschaeftsfuehrer = GESCHAEFTSFUEHRER_IDS.map(id => buildGeschaeftsfuehrerNode(id));

    const allPersons = [...allEmployees, ...geschaeftsfuehrer];

    for (const employee of allPersons) {
      const entries = await this.#revenueRepository.findByEmployeeId(employee.id);
      const isGeschaeftsfuehrer = isGeschaeftsfuehrerId(employee.id);

      for (const entry of entries) {
        let hierarchyPath;
        let directSubordinate;

        if (isGeschaeftsfuehrer) {
          // Geschäftsführer are directly under company
          hierarchyPath = [company, employee];
          directSubordinate = employee;
        } else {
          // Build hierarchy path from employee to company
          hierarchyPath = this.#getHierarchyPath(tree, employee.id, companyId);

          if (hierarchyPath.length < 2) {
            continue; // Invalid path
          }

          // Find direct subordinate under company (second in path from company)
          // Path is: [company, directSub, ..., employee]
          directSubordinate = hierarchyPath[1];
        }

        // Calculate company provision using CompanyRevenueEntry
        const companyEntry = CompanyRevenueEntry.calculate({
          entry,
          entryOwner: employee,
          directSubordinate,
          company,
          hierarchyPath,
        });

        // Only add if company gets provision
        if (companyEntry.hasCompanyProvision) {
          companyEntries.push(companyEntry);
        }
      }
    }

    // Sort by hierarchy depth, then by customer number
    companyEntries.sort((a, b) => {
      const depthCompare = a.hierarchyDepth - b.hierarchyDepth;
      if (depthCompare !== 0) return depthCompare;
      return a.originalEntry.customerNumber - b.originalEntry.customerNumber;
    });

    return companyEntries;
  }

  /**
   * Check if an employee ID belongs to a Geschäftsführer
   */
  #isGeschaeftsfuehrer(employeeId) {
    return isGeschaeftsfuehrerId(employeeId);
  }

  /**
   * Get Geschäftsführer data by ID (as node-like object)
   */
  #getGeschaeftsfuehrerData(employeeId) {
    return buildGeschaeftsfuehrerNode(employeeId);
  }

  /**
   * Capture provision snapshots from hierarchy at entry creation time
   * This ensures immutable provision calculations even if hierarchy provisions change later
   */
  async #captureProvisionSnapshots(employeeId, entryData) {
    Logger.log('📸 Capturing provision snapshots for employee:', employeeId);

    try {
      // Determine provision type (from entryData or infer from category)
      const provisionType = entryData.provisionType || this.#inferProvisionType(entryData.category);
      Logger.log('   Provision type:', provisionType);

      // Check if employee is a Geschäftsführer (not in tree, hardcoded data)
      if (this.#isGeschaeftsfuehrer(employeeId)) {
        const gfData = this.#getGeschaeftsfuehrerData(employeeId);
        Logger.log('   ✓ Geschäftsführer detected:', gfData.name);

        const ownerProvision = this.#getProvisionRateByType(gfData, provisionType);

        Logger.log('   📊 Snapshot values (Geschäftsführer):');
        Logger.log('      Owner provision:', ownerProvision + '%');
        Logger.log('      Manager provision: null (reports to company)');

        const hierarchySnapshot = {
          ownerId: gfData.id,
          ownerName: gfData.name,
          managerId: null,
          managerName: 'Geschäftsführung',
          capturedAt: new Date().toISOString(),
          isGeschaeftsfuehrer: true,
        };

        Logger.log('✅ Provision snapshots captured successfully (Geschäftsführer)');
        return {
          ownerProvisionSnapshot: ownerProvision,
          managerProvisionSnapshot: null,
          hierarchySnapshot,
        };
      }

      // Get the main organization tree (use first tree if mainTreeId doesn't exist)
      let tree = null;

      try {
        const { APP_CONFIG } = await import('../../../../core/config/index.js');
        tree = await this.#hierarchyService.getTree(APP_CONFIG.mainTreeId);
      } catch (error) {
        // Fallback: Get first available tree
        Logger.log('   Fallback: Using first available tree');
        const allTrees = await this.#hierarchyService.getAllTrees();
        tree = allTrees.length > 0 ? allTrees[0] : null;
      }

      if (!tree) {
        Logger.warn('❌ Could not load tree for provision snapshot - entry will use dynamic calculation');
        return {
          ownerProvisionSnapshot: null,
          managerProvisionSnapshot: null,
          hierarchySnapshot: null,
        };
      }

      Logger.log('   ✓ Tree loaded:', tree.name);

      // Get owner (employee) node - use hasNode to check first to avoid exception
      if (!tree.hasNode(employeeId)) {
        Logger.warn(`❌ Employee node ${employeeId} not found in tree - entry will use dynamic calculation`);
        return {
          ownerProvisionSnapshot: null,
          managerProvisionSnapshot: null,
          hierarchySnapshot: null,
        };
      }

      const owner = tree.getNode(employeeId);
      Logger.log('   ✓ Owner node:', owner.name);

      // Get manager (parent) node - may be null for root-level employees
      const manager = owner.parentId ? tree.getNode(owner.parentId) : null;
      Logger.log('   Manager:', manager ? manager.name : 'none');

      // Get provision rates at this point in time
      const ownerProvision = this.#getProvisionRateByType(owner, provisionType);
      const managerProvision = manager ? this.#getProvisionRateByType(manager, provisionType) : null;

      Logger.log('   📊 Snapshot values:');
      Logger.log('      Owner provision:', ownerProvision + '%');
      Logger.log('      Manager provision:', managerProvision ? managerProvision + '%' : 'null');

      // Create hierarchy snapshot for audit trail
      const hierarchySnapshot = {
        ownerId: owner.id,
        ownerName: owner.name,
        managerId: manager?.id || null,
        managerName: manager?.name || null,
        capturedAt: new Date().toISOString(),
      };

      const snapshots = {
        ownerProvisionSnapshot: ownerProvision,
        managerProvisionSnapshot: managerProvision,
        hierarchySnapshot,
      };

      Logger.log('✅ Provision snapshots captured successfully');
      return snapshots;
    } catch (error) {
      Logger.error('❌ Failed to capture provision snapshots:', error);
      // Return null values - entry will fall back to dynamic calculation
      return {
        ownerProvisionSnapshot: null,
        managerProvisionSnapshot: null,
        hierarchySnapshot: null,
      };
    }
  }

  /**
   * Infer provisionType from category type for backward compatibility
   */
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

  /**
   * Get all employees in the tree recursively (excluding root)
   */
  #getAllEmployeesRecursive(tree, nodeId, result = []) {
    const children = tree.getChildren(nodeId);

    for (const child of children) {
      result.push(child);
      this.#getAllEmployeesRecursive(tree, child.id, result);
    }

    return result;
  }

  /**
   * Get hierarchy path from employee to company (root)
   * Returns list: [company, directSub, ..., employee]
   */
  #getHierarchyPath(tree, employeeId, companyId) {
    const path = [];
    let currentId = employeeId;

    // Build path from employee upwards
    while (currentId) {
      const node = tree.getNode(currentId);
      if (!node) break;

      path.unshift(node); // Insert at beginning

      if (currentId === companyId) {
        break; // Reached company
      }

      currentId = node.parentId;
    }

    return path;
  }

  /**
   * Get aggregated revenue data for all employees in the tree
   * Returns Map<employeeId, { monthlyRevenue, entryCount, employeeProvision, totalRevenue?, companyProvision? }>
   * Note: Rejected entries are excluded from calculations
   */
  async getRevenueDataForTree(treeId, month = null, year = null) {
    const tree = await this.#hierarchyService.getTree(treeId);
    if (!tree) {
      return new Map();
    }

    const revenueDataMap = new Map();
    let totalCompanyRevenue = 0;
    let totalCompanyEntries = 0;
    let totalEmployeeProvisions = 0;

    // Get all employees (excluding root)
    const allEmployees = this.#getAllEmployeesRecursive(tree, tree.rootId);

    // Process all employees + Geschäftsführer
    const allPersons = [...allEmployees, ...GESCHAEFTSFUEHRER_IDS.map(id => buildGeschaeftsfuehrerNode(id))];

    // OPTIMIZATION: Load ALL entries with ONE query instead of N queries
    // This reduces Firestore reads from 100+ to 1 for 50 employees
    const allEntries = await this.#revenueRepository.findAll();

    // Group entries by employeeId and tipProviderId for O(1) lookup
    const entriesByEmployee = new Map();
    const entriesByTipProvider = new Map();

    for (const entry of allEntries) {
      // Group by employeeId (owner)
      if (!entriesByEmployee.has(entry.employeeId)) {
        entriesByEmployee.set(entry.employeeId, []);
      }
      entriesByEmployee.get(entry.employeeId).push(entry);

      // Group by each tip provider (multi-tip-provider support)
      for (const tp of entry.tipProviders) {
        if (!entriesByTipProvider.has(tp.id)) {
          entriesByTipProvider.set(tp.id, []);
        }
        entriesByTipProvider.get(tp.id).push(entry);
      }
    }

    for (const employee of allPersons) {
      // Get entries from pre-loaded and grouped data (O(1) lookup)
      const entries = entriesByEmployee.get(employee.id) || [];
      const tipProviderEntries = entriesByTipProvider.get(employee.id) || [];

      // Filter by month/year if specified
      const filteredEntries = this.#filterEntriesByMonth(entries, month, year);
      const filteredTipProviderEntries = this.#filterEntriesByMonth(tipProviderEntries, month, year);

      // Calculate totals - exclude rejected and cancelled entries
      let monthlyRevenue = 0;
      let employeeProvision = 0;
      let activeEntryCount = 0;

      for (const entry of filteredEntries) {
        // Skip rejected and cancelled entries in calculations
        if (entry.status?.type === REVENUE_STATUS_TYPES.REJECTED ||
            entry.status?.type === REVENUE_STATUS_TYPES.CANCELLED) {
          continue;
        }

        const entryRevenue = entry.grossAmount || entry.provisionAmount || 0;
        monthlyRevenue += entryRevenue;
        activeEntryCount++;

        // Calculate employee's provision based on provisionType (or fallback to category)
        const provisionRate = this.#getEmployeeProvisionRateForEntry(employee, entry);
        employeeProvision += entryRevenue * (provisionRate / 100);
      }

      // Calculate tip provider revenue and provision
      let tipProviderRevenue = 0;
      let tipProviderProvision = 0;
      let tipProviderEntryCount = 0;

      for (const entry of filteredTipProviderEntries) {
        // Skip rejected and cancelled entries in calculations
        if (entry.status?.type === REVENUE_STATUS_TYPES.REJECTED ||
            entry.status?.type === REVENUE_STATUS_TYPES.CANCELLED) {
          continue;
        }

        const entryRevenue = entry.grossAmount || entry.provisionAmount || 0;
        const allocation = entry.tipProviders.find(tp => tp.id === employee.id);
        const tipProvision = allocation ? allocation.calculateAmount(entryRevenue) : 0;

        tipProviderRevenue += entryRevenue;
        tipProviderProvision += tipProvision;
        tipProviderEntryCount++;
      }

      revenueDataMap.set(employee.id, {
        monthlyRevenue,
        entryCount: activeEntryCount,
        employeeProvision,
        // Tip Provider data (new)
        tipProviderRevenue,
        tipProviderProvision,
        tipProviderEntryCount,
      });

      // Accumulate for company total
      totalCompanyRevenue += monthlyRevenue;
      totalCompanyEntries += activeEntryCount;
      totalEmployeeProvisions += employeeProvision;
    }

    // Include direct company entries (root node's own revenue)
    const rootEntries = entriesByEmployee.get(tree.rootId) || [];
    const filteredRootEntries = this.#filterEntriesByMonth(rootEntries, month, year);
    let directCompanyRevenue = 0;
    let directCompanyEntries = 0;

    for (const entry of filteredRootEntries) {
      if (entry.status?.type === REVENUE_STATUS_TYPES.REJECTED ||
          entry.status?.type === REVENUE_STATUS_TYPES.CANCELLED) {
        continue;
      }
      directCompanyRevenue += entry.provisionAmount || 0;
      directCompanyEntries++;
    }

    totalCompanyRevenue += directCompanyRevenue;
    totalCompanyEntries += directCompanyEntries;

    // Company provision = total revenue - all employee provisions
    const companyProvision = totalCompanyRevenue - totalEmployeeProvisions;

    // Set root node data with total company revenue and company provision
    revenueDataMap.set(tree.rootId, {
      monthlyRevenue: directCompanyRevenue,
      entryCount: directCompanyEntries,
      employeeProvision: 0,
      totalRevenue: totalCompanyRevenue,
      totalEntries: totalCompanyEntries,
      companyProvision: companyProvision,
      totalEmployees: allEmployees.length,
    });

    return revenueDataMap;
  }

  /**
   * Get employee's provision rate for an entry
   * PRIORITY: Uses provision snapshot if available (immutable)
   * FALLBACK: Uses current provision rate from employee node (legacy entries)
   * DEDUCTION: Tip provider provision is deducted from owner's share
   */
  #getEmployeeProvisionRateForEntry(employee, entry) {
    let baseProvision = 0;

    // PRIORITY: Use provision snapshot if available (immutable, point-in-time value)
    if (entry.hasProvisionSnapshot) {
      baseProvision = entry.ownerProvisionSnapshot || 0;
    }
    // FALLBACK: Dynamic calculation for legacy entries without snapshots
    else if (employee) {
      // Use provisionType if available (new entries with dynamic categories)
      const provisionType = entry.provisionType;
      if (provisionType) {
        baseProvision = this.#getProvisionRateByType(employee, provisionType);
      } else {
        // Fallback to category type for legacy entries
        baseProvision = this.#getProvisionRateByCategory(employee, entry.category?.type);
      }
    }

    // Tip provider provision is deducted from OWNER's share (not from company)
    // The tip provider's share comes from the owner's provision
    const tipProviderPercentage = entry.totalTipProviderPercentage;
    const effectiveProvision = Math.max(0, baseProvision - tipProviderPercentage);

    return effectiveProvision;
  }

  /**
   * Get employee's provision rate by provisionType
   * provisionType is one of: 'bank', 'insurance', 'realEstate'
   */
  #getProvisionRateByType(employee, provisionType) {
    switch (provisionType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
        return employee.realEstateProvision || 0;
      default:
        return 0;
    }
  }

  /**
   * Get employee's provision rate for a category (legacy support)
   */
  #getProvisionRateByCategory(employee, categoryType) {
    if (!employee) return 0;

    switch (categoryType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
      case 'propertyManagement':
        return employee.realEstateProvision || 0;
      case 'energyContracts':
        return employee.bankProvision || 0; // Default to bank for energy
      default:
        return 0;
    }
  }

  /**
   * Filter entries by month and year
   */
  #filterEntriesByMonth(entries, month, year) {
    if (month === null || year === null) {
      return entries;
    }

    return entries.filter((entry) => {
      const entryDate = entry.entryDate || entry.createdAt;
      if (!entryDate) return false;

      const date = new Date(entryDate);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }

  // ========================================
  // CATALOG INTEGRATION (for dynamic product catalog)
  // ========================================

  /**
   * Get all available categories from catalog
   * Falls back to hardcoded categories if CatalogService not available
   */
  async getAvailableCategories() {
    if (this.#catalogService) {
      try {
        return await this.#catalogService.getAllCategories(false);
      } catch (error) {
        Logger.warn('Failed to load categories from catalog, using fallback:', error);
      }
    }

    // Fallback to hardcoded categories
    const { RevenueCategory } = await import('../value-objects/RevenueCategory.js');
    return RevenueCategory.allCategories;
  }

  /**
   * Get products for a specific category from catalog
   * Falls back to hardcoded products if CatalogService not available
   */
  async getProductsForCategory(categoryType) {
    if (this.#catalogService) {
      try {
        return await this.#catalogService.getProductsByCategory(categoryType, false);
      } catch (error) {
        Logger.warn('Failed to load products from catalog, using fallback:', error);
      }
    }

    // Fallback to hardcoded products
    const { Product } = await import('../value-objects/Product.js');
    return Product.getProductsForCategory(categoryType);
  }

  /**
   * Get providers for a specific category from catalog
   * Falls back to hardcoded providers if CatalogService not available
   */
  async getProvidersForProduct(productId) {
    if (!this.#catalogService) {
      throw new Error('CatalogService not available');
    }

    // Load providers for specific product
    return await this.#catalogService.getProvidersByProduct(productId, false);
  }

  async getProvidersForCategory(categoryType) {
    if (!this.#catalogService) {
      throw new Error('CatalogService not available');
    }

    // Load all providers for all products in this category (merged & deduplicated)
    return await this.#catalogService.getProvidersForCategory(categoryType, false);
  }

  /**
   * Get category by type from catalog
   * Falls back to hardcoded category if CatalogService not available
   */
  async getCategoryByType(categoryType) {
    if (this.#catalogService) {
      try {
        return await this.#catalogService.getCategoryByType(categoryType);
      } catch (error) {
        Logger.warn('Failed to load category from catalog, using fallback:', error);
      }
    }

    // Fallback: return null (calling code should handle)
    return null;
  }

  /**
   * Subscribe to real-time revenue updates
   * @param {Function} callback - Callback receiving updated entries
   * @returns {Promise<Function>} Unsubscribe function
   */
  subscribeToRevenueUpdates(callback) {
    if (typeof this.#revenueRepository.subscribeToRevenue === 'function') {
      return this.#revenueRepository.subscribeToRevenue(callback);
    }
    Logger.warn('Repository does not support real-time revenue subscriptions');
    return Promise.resolve(() => {});
  }
}
