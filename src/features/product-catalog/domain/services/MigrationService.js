/**
 * Domain Service: MigrationService
 * One-time migration of hardcoded catalog data to Firestore
 */

import { REVENUE_CATEGORY_TYPES } from '../../../revenue-tracking/domain/value-objects/RevenueCategory.js';
import { Product } from '../../../revenue-tracking/domain/value-objects/Product.js';
import { ProductProvider } from '../../../revenue-tracking/domain/value-objects/ProductProvider.js';
import { PROVISION_TYPES } from '../value-objects/ProvisionType.js';
import { CategoryDefinition } from '../entities/CategoryDefinition.js';
import { ProductDefinition } from '../entities/ProductDefinition.js';
import { ProviderDefinition } from '../entities/ProviderDefinition.js';
import { Logger } from './../../../../core/utils/logger.js';

export class MigrationService {
  #catalogService;

  constructor(catalogService) {
    this.#catalogService = catalogService;
  }

  async migrateHardcodedData() {
    Logger.log('🔄 Starting catalog migration...');

    try {
      // 1. Check if catalog already populated
      let existingCategories = [];
      try {
        existingCategories = await this.#catalogService.getAllCategories();
      } catch (error) {
        // If permission error or collection doesn't exist, treat as empty
        Logger.log('📦 Catalog collection empty or not accessible, proceeding with migration...');
      }

      if (existingCategories.length > 0) {
        Logger.log('✓ Catalog already migrated, skipping...');
        return { skipped: true, reason: 'Catalog not empty' };
      }

      Logger.log('📦 Migrating hardcoded catalog data to Firestore...');

      // 2. Migrate categories
      const categoryMap = await this.#migrateCategories();
      Logger.log(`✓ Migrated ${categoryMap.size} categories`);

      // 3. Migrate products
      const productCount = await this.#migrateProducts();
      Logger.log(`✓ Migrated ${productCount} products`);

      // 4. Migrate providers
      const providerCount = await this.#migrateProviders();
      Logger.log(`✓ Migrated ${providerCount} providers`);

      Logger.log('✅ Catalog migration completed successfully');
      return {
        success: true,
        categories: categoryMap.size,
        products: productCount,
        providers: providerCount,
      };
    } catch (error) {
      Logger.error('❌ Catalog migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async #migrateCategories() {
    const categoryMap = new Map();
    let order = 0;

    // Map hardcoded categories to provision types
    const categoryProvisionMapping = {
      [REVENUE_CATEGORY_TYPES.BANK]: PROVISION_TYPES.BANK,
      [REVENUE_CATEGORY_TYPES.INSURANCE]: PROVISION_TYPES.INSURANCE,
      [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: PROVISION_TYPES.REAL_ESTATE,
      [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: PROVISION_TYPES.REAL_ESTATE,
      // TODO: energyContracts provision needs clarification - using BANK temporarily
      [REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS]: PROVISION_TYPES.BANK,
    };

    const categoryDisplayNames = {
      [REVENUE_CATEGORY_TYPES.BANK]: 'Bank',
      [REVENUE_CATEGORY_TYPES.INSURANCE]: 'Versicherung',
      [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: 'Immobilien',
      [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: 'Hausverwaltung',
      [REVENUE_CATEGORY_TYPES.ENERGY_CONTRACTS]: 'Energieverträge',
    };

    const requiresPropertyAddress = {
      [REVENUE_CATEGORY_TYPES.REAL_ESTATE]: true,
      [REVENUE_CATEGORY_TYPES.PROPERTY_MANAGEMENT]: true,
    };

    for (const categoryType of Object.values(REVENUE_CATEGORY_TYPES)) {
      try {
        const category = await this.#catalogService.createCategory({
          type: categoryType,
          displayName: categoryDisplayNames[categoryType] || categoryType,
          provisionType: categoryProvisionMapping[categoryType],
          requiresPropertyAddress: requiresPropertyAddress[categoryType] || false,
          order: order++,
        });

        categoryMap.set(categoryType, category);
        Logger.log(`  ✓ Category: ${category.displayName} (${category.type})`);
      } catch (error) {
        Logger.error(`  ✗ Failed to migrate category ${categoryType}:`, error.message);
      }
    }

    return categoryMap;
  }

  async #migrateProducts() {
    let productCount = 0;

    // Get all products from hardcoded data
    const allProducts = Product.allProducts;

    for (const product of allProducts) {
      try {
        await this.#catalogService.createProduct(product.category, {
          name: product.name,
          order: productCount,
        });

        productCount++;
        Logger.log(`  ✓ Product: ${product.name} (${product.category})`);
      } catch (error) {
        Logger.error(`  ✗ Failed to migrate product ${product.name}:`, error.message);
      }
    }

    return productCount;
  }

  async #migrateProviders() {
    let providerCount = 0;

    // Get all providers from hardcoded data (category-specific)
    const allProviders = ProductProvider.allProviders;

    // For each hardcoded provider, duplicate for ALL products in that category
    for (const provider of allProviders) {
      try {
        // Get all products for this category
        const products = await this.#catalogService.getProductsByCategory(provider.category, false);

        if (products.length === 0) {
          Logger.warn(`  ⚠ No products found for category ${provider.category}, skipping provider ${provider.name}`);
          continue;
        }

        // Duplicate provider for each product
        for (const product of products) {
          await this.#catalogService.createProvider(product.id, {
            name: provider.name,
            order: 0,
          });
          providerCount++;
        }

        Logger.log(`  ✓ Provider: ${provider.name} duplicated to ${products.length} product(s) in ${provider.category}`);
      } catch (error) {
        Logger.error(`  ✗ Failed to migrate provider ${provider.name}:`, error.message);
      }
    }

    return providerCount;
  }

  /**
   * Rollback migration (for testing/debugging)
   * WARNING: This deletes all catalog data!
   */
  async rollbackMigration() {
    Logger.log('⚠️  Rolling back migration - deleting all catalog data...');

    try {
      // Delete all categories (cascade deletes products/providers via validation)
      const categories = await this.#catalogService.getAllCategories(true);

      for (const category of categories) {
        try {
          // Delete all products in this category first
          const products = await this.#catalogService.getProductsByCategory(category.type, true);
          for (const product of products) {
            await this.#catalogService.deleteProduct(product.id);
          }

          // Providers are automatically deleted via product cascade delete
          // No need to delete separately

          // Now delete the category
          await this.#catalogService.deleteCategory(category.type);
          Logger.log(`  ✓ Deleted category: ${category.displayName}`);
        } catch (error) {
          Logger.error(`  ✗ Failed to delete category ${category.type}:`, error.message);
        }
      }

      Logger.log('✓ Migration rollback completed');
      return { success: true };
    } catch (error) {
      Logger.error('❌ Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
}
