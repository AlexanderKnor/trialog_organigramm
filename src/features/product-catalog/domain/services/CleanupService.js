/**
 * Domain Service: CleanupService
 * Utility service for cleaning up and fixing catalog data
 */

export class CleanupService {
  #catalogService;

  constructor(catalogService) {
    this.#catalogService = catalogService;
  }

  /**
   * Analyze catalog for duplicates and issues
   */
  async analyzeCatalog() {
    console.log('🔍 Analyzing catalog...');

    const categories = await this.#catalogService.getAllCategories(true);
    const products = await this.#catalogService.getAllProducts(true);
    const providers = await this.#catalogService.getAllProviders(true);

    console.log('\n📊 Catalog Summary:');
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Providers: ${providers.length}`);

    // Check for missing realEstate category
    const hasRealEstate = categories.some((c) => c.type === 'realEstate');
    console.log(`\n🏠 RealEstate Category: ${hasRealEstate ? '✓ Found' : '❌ MISSING'}`);

    // Check for duplicates
    const duplicates = this.#findDuplicates(products, 'name');
    if (duplicates.size > 0) {
      console.log('\n⚠️  Duplicate Products Found:');
      duplicates.forEach((ids, name) => {
        console.log(`  "${name}": ${ids.length} duplicates (IDs: ${ids.join(', ')})`);
      });
    }

    const providerDuplicates = this.#findDuplicates(providers, 'name');
    if (providerDuplicates.size > 0) {
      console.log('\n⚠️  Duplicate Providers Found:');
      providerDuplicates.forEach((ids, name) => {
        console.log(`  "${name}": ${ids.length} duplicates (IDs: ${ids.join(', ')})`);
      });
    }

    return {
      categories,
      products,
      providers,
      hasRealEstate,
      duplicateProducts: duplicates,
      duplicateProviders: providerDuplicates,
    };
  }

  #findDuplicates(items, key) {
    const duplicates = new Map();
    const seen = new Map();

    items.forEach((item) => {
      const value = item[key];
      if (!value) return;

      if (seen.has(value)) {
        if (!duplicates.has(value)) {
          duplicates.set(value, [seen.get(value)]);
        }
        duplicates.get(value).push(item.id);
      } else {
        seen.set(value, item.id);
      }
    });

    return duplicates;
  }

  /**
   * Remove duplicate products (keeps newest)
   */
  async removeDuplicateProducts() {
    console.log('🧹 Removing duplicate products...');

    const products = await this.#catalogService.getAllProducts(true);
    const duplicates = this.#findDuplicates(products, 'name');

    if (duplicates.size === 0) {
      console.log('✓ No duplicates found');
      return { removed: 0 };
    }

    let removedCount = 0;

    for (const [name, ids] of duplicates.entries()) {
      console.log(`\n  Processing "${name}" (${ids.length} duplicates)...`);

      // Get all duplicate product objects
      const duplicateProducts = products.filter((p) => ids.includes(p.id));

      // Sort by updatedAt (keep newest)
      duplicateProducts.sort((a, b) => {
        const aTime = new Date(a.metadata.updatedAt).getTime();
        const bTime = new Date(b.metadata.updatedAt).getTime();
        return bTime - aTime; // Newest first
      });

      // Keep first (newest), remove rest
      const toKeep = duplicateProducts[0];
      const toRemove = duplicateProducts.slice(1);

      console.log(`    Keep: ${toKeep.id} (updated: ${toKeep.metadata.updatedAt})`);

      for (const product of toRemove) {
        try {
          await this.#catalogService.deleteProduct(product.id);
          console.log(`    ✓ Removed: ${product.id}`);
          removedCount++;
        } catch (error) {
          console.error(`    ✗ Failed to remove ${product.id}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Removed ${removedCount} duplicate products`);
    return { removed: removedCount };
  }

  /**
   * Remove duplicate providers (keeps newest)
   */
  async removeDuplicateProviders() {
    console.log('🧹 Removing duplicate providers...');

    const providers = await this.#catalogService.getAllProviders(true);
    const duplicates = this.#findDuplicates(providers, 'name');

    if (duplicates.size === 0) {
      console.log('✓ No duplicates found');
      return { removed: 0 };
    }

    let removedCount = 0;

    for (const [name, ids] of duplicates.entries()) {
      console.log(`\n  Processing "${name}" (${ids.length} duplicates)...`);

      const duplicateProviders = providers.filter((p) => ids.includes(p.id));

      duplicateProviders.sort((a, b) => {
        const aTime = new Date(a.metadata.updatedAt).getTime();
        const bTime = new Date(b.metadata.updatedAt).getTime();
        return bTime - aTime;
      });

      const toKeep = duplicateProviders[0];
      const toRemove = duplicateProviders.slice(1);

      console.log(`    Keep: ${toKeep.id}`);

      for (const provider of toRemove) {
        try {
          await this.#catalogService.deleteProvider(provider.id);
          console.log(`    ✓ Removed: ${provider.id}`);
          removedCount++;
        } catch (error) {
          console.error(`    ✗ Failed to remove ${provider.id}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Removed ${removedCount} duplicate providers`);
    return { removed: removedCount };
  }

  /**
   * Restore missing realEstate category
   */
  async restoreRealEstateCategory() {
    console.log('🏠 Restoring realEstate category...');

    try {
      const existing = await this.#catalogService.getCategoryByType('realEstate');
      if (existing) {
        console.log('✓ RealEstate category already exists');
        return { restored: false, reason: 'Already exists' };
      }
    } catch (error) {
      // Not found, proceed with creation
    }

    try {
      await this.#catalogService.createCategory({
        type: 'realEstate',
        displayName: 'Immobilien',
        provisionType: 'realEstate',
        requiresPropertyAddress: true,
        order: 2,
      });

      console.log('✅ RealEstate category restored');
      return { restored: true };
    } catch (error) {
      console.error('❌ Failed to restore realEstate category:', error);
      return { restored: false, error: error.message };
    }
  }

  /**
   * Full cleanup: remove duplicates and restore missing categories
   */
  async fullCleanup() {
    console.log('\n🚀 Starting full cleanup...\n');

    const analysis = await this.analyzeCatalog();

    console.log('\n' + '='.repeat(60));

    // Step 1: Remove duplicate products
    if (analysis.duplicateProducts.size > 0) {
      const productResult = await this.removeDuplicateProducts();
      console.log(`\n✓ Removed ${productResult.removed} duplicate products`);
    }

    // Step 2: Remove duplicate providers
    if (analysis.duplicateProviders.size > 0) {
      const providerResult = await this.removeDuplicateProviders();
      console.log(`\n✓ Removed ${providerResult.removed} duplicate providers`);
    }

    // Step 3: Restore missing realEstate category
    if (!analysis.hasRealEstate) {
      const restoreResult = await this.restoreRealEstateCategory();
      if (restoreResult.restored) {
        console.log('\n✓ Restored realEstate category');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Cleanup completed!\n');

    // Re-analyze after cleanup
    return await this.analyzeCatalog();
  }
}
