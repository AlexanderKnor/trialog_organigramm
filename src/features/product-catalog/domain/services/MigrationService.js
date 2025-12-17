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

export class MigrationService {
  #catalogService;

  constructor(catalogService) {
    this.#catalogService = catalogService;
  }

  async migrateHardcodedData() {
    console.log('🔄 Starting catalog migration...');

    try {
      // 1. Check if catalog already populated
      let existingCategories = [];
      try {
        existingCategories = await this.#catalogService.getAllCategories();
      } catch (error) {
        // If permission error or collection doesn't exist, treat as empty
        console.log('📦 Catalog collection empty or not accessible, proceeding with migration...');
      }

      if (existingCategories.length > 0) {
        console.log('✓ Catalog already migrated, skipping...');
        return { skipped: true, reason: 'Catalog not empty' };
      }

      console.log('📦 Migrating hardcoded catalog data to Firestore...');

      // 2. Migrate categories
      const categoryMap = await this.#migrateCategories();
      console.log(`✓ Migrated ${categoryMap.size} categories`);

      // 3. Migrate products
      const productCount = await this.#migrateProducts();
      console.log(`✓ Migrated ${productCount} products`);

      // 4. Migrate providers
      const providerCount = await this.#migrateProviders();
      console.log(`✓ Migrated ${providerCount} providers`);

      console.log('✅ Catalog migration completed successfully');
      return {
        success: true,
        categories: categoryMap.size,
        products: productCount,
        providers: providerCount,
      };
    } catch (error) {
      console.error('❌ Catalog migration failed:', error);
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
        console.log(`  ✓ Category: ${category.displayName} (${category.type})`);
      } catch (error) {
        console.error(`  ✗ Failed to migrate category ${categoryType}:`, error.message);
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
        console.log(`  ✓ Product: ${product.name} (${product.category})`);
      } catch (error) {
        console.error(`  ✗ Failed to migrate product ${product.name}:`, error.message);
      }
    }

    return productCount;
  }

  async #migrateProviders() {
    let providerCount = 0;

    // Get all providers from hardcoded data
    const allProviders = ProductProvider.allProviders;

    for (const provider of allProviders) {
      try {
        await this.#catalogService.createProvider(provider.category, {
          name: provider.name,
          order: providerCount,
        });

        providerCount++;
        console.log(`  ✓ Provider: ${provider.name} (${provider.category})`);
      } catch (error) {
        console.error(`  ✗ Failed to migrate provider ${provider.name}:`, error.message);
      }
    }

    return providerCount;
  }

  /**
   * Rollback migration (for testing/debugging)
   * WARNING: This deletes all catalog data!
   */
  async rollbackMigration() {
    console.log('⚠️  Rolling back migration - deleting all catalog data...');

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

          // Delete all providers in this category
          const providers = await this.#catalogService.getProvidersByCategory(category.type, true);
          for (const provider of providers) {
            await this.#catalogService.deleteProvider(provider.id);
          }

          // Now delete the category
          await this.#catalogService.deleteCategory(category.type);
          console.log(`  ✓ Deleted category: ${category.displayName}`);
        } catch (error) {
          console.error(`  ✗ Failed to delete category ${category.type}:`, error.message);
        }
      }

      console.log('✓ Migration rollback completed');
      return { success: true };
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
}
