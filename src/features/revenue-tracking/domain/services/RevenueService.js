/**
 * Domain Service: RevenueService
 * Orchestrates domain operations for revenue tracking
 */

import { RevenueEntry } from '../entities/RevenueEntry.js';
import { HierarchicalRevenueEntry } from '../entities/HierarchicalRevenueEntry.js';
import { CompanyRevenueEntry } from '../entities/CompanyRevenueEntry.js';
import { REVENUE_STATUS_TYPES } from '../value-objects/RevenueStatus.js';

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

    const entry = new RevenueEntry({
      ...entryData,
      employeeId,
      customerNumber,
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

  async deleteEntry(entryId) {
    await this.#revenueRepository.delete(entryId);
  }

  async searchEntries(query) {
    return await this.#revenueRepository.search(query);
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

    // Get all employees in the organization (excluding root)
    const allEmployees = this.#getAllEmployeesRecursive(tree, companyId);

    // Add Geschäftsführer to the list
    const geschaeftsfuehrerIds = ['marcel-liebetrau', 'daniel-lippa'];
    const geschaeftsfuehrerData = {
      'marcel-liebetrau': { id: 'marcel-liebetrau', name: 'Marcel Liebetrau', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
      'daniel-lippa': { id: 'daniel-lippa', name: 'Daniel Lippa', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
    };
    const geschaeftsfuehrer = geschaeftsfuehrerIds.map(id => geschaeftsfuehrerData[id]);

    const allPersons = [...allEmployees, ...geschaeftsfuehrer];

    for (const employee of allPersons) {
      const entries = await this.#revenueRepository.findByEmployeeId(employee.id);
      const isGeschaeftsfuehrer = geschaeftsfuehrerIds.includes(employee.id);

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

    // Fixed Geschäftsführer IDs
    const geschaeftsfuehrerIds = ['marcel-liebetrau', 'daniel-lippa'];
    const geschaeftsfuehrerData = {
      'marcel-liebetrau': { name: 'Marcel Liebetrau', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
      'daniel-lippa': { name: 'Daniel Lippa', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
    };

    // Process all employees + Geschäftsführer
    const allPersons = [...allEmployees, ...geschaeftsfuehrerIds.map(id => ({ id, ...geschaeftsfuehrerData[id] }))];

    for (const employee of allPersons) {
      const entries = await this.#revenueRepository.findByEmployeeId(employee.id);

      // Filter by month/year if specified
      const filteredEntries = this.#filterEntriesByMonth(entries, month, year);

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

        const entryRevenue = entry.provisionAmount || 0;
        monthlyRevenue += entryRevenue;
        activeEntryCount++;

        // Calculate employee's provision based on category
        const provisionRate = this.#getEmployeeProvisionRate(employee, entry.category?.type);
        employeeProvision += entryRevenue * (provisionRate / 100);
      }

      revenueDataMap.set(employee.id, {
        monthlyRevenue,
        entryCount: activeEntryCount,
        employeeProvision,
      });

      // Accumulate for company total
      totalCompanyRevenue += monthlyRevenue;
      totalCompanyEntries += activeEntryCount;
      totalEmployeeProvisions += employeeProvision;
    }

    // Company provision = total revenue - all employee provisions
    const companyProvision = totalCompanyRevenue - totalEmployeeProvisions;

    // Set root node data with total company revenue and company provision
    revenueDataMap.set(tree.rootId, {
      monthlyRevenue: 0, // Root doesn't have own entries
      entryCount: 0,
      employeeProvision: 0,
      totalRevenue: totalCompanyRevenue,
      totalEntries: totalCompanyEntries,
      companyProvision: companyProvision,
      totalEmployees: allEmployees.length, // Total count of all employees in tree
    });

    return revenueDataMap;
  }

  /**
   * Get employee's provision rate for a category
   */
  #getEmployeeProvisionRate(employee, categoryType) {
    if (!employee) return 0;

    switch (categoryType) {
      case 'bank':
        return employee.bankProvision || 0;
      case 'insurance':
        return employee.insuranceProvision || 0;
      case 'realEstate':
      case 'propertyManagement':
        return employee.realEstateProvision || 0;
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
        console.warn('Failed to load categories from catalog, using fallback:', error);
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
        console.warn('Failed to load products from catalog, using fallback:', error);
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
        console.warn('Failed to load category from catalog, using fallback:', error);
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
    console.warn('Repository does not support real-time revenue subscriptions');
    return Promise.resolve(() => {});
  }
}
