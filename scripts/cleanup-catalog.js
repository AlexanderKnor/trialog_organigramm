/**
 * Catalog Cleanup Script
 * Run this in the browser console to fix catalog issues
 *
 * IMPORTANT: You must be logged in as ADMIN before running this!
 *
 * Usage:
 * 1. Open the app in browser
 * 2. Login as admin
 * 3. Open browser console (F12)
 * 4. Copy/paste this entire script
 * 5. Run: await cleanupCatalog()
 */

async function analyzeCatalog() {
  console.log('🔍 Analyzing catalog...');

  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found! Make sure you are on the main app page.');
    return null;
  }

  const categories = await catalogService.getAllCategories(true);
  const products = await catalogService.getAllProducts(true);
  const providers = await catalogService.getAllProviders(true);

  console.log('\n📊 Catalog Summary:');
  console.log(`  Categories: ${categories.length}`);
  categories.forEach((c) => console.log(`    - ${c.type}: ${c.displayName}`));

  console.log(`\n  Products: ${products.length}`);
  const productsByCategory = {};
  products.forEach((p) => {
    if (!productsByCategory[p.categoryType]) {
      productsByCategory[p.categoryType] = [];
    }
    productsByCategory[p.categoryType].push(p.name);
  });
  Object.entries(productsByCategory).forEach(([cat, prods]) => {
    console.log(`    ${cat}: ${prods.join(', ')}`);
  });

  console.log(`\n  Providers: ${providers.length}`);

  // Check for missing realEstate
  const hasRealEstate = categories.some((c) => c.type === 'realEstate');
  console.log(`\n🏠 RealEstate Category: ${hasRealEstate ? '✓ Found' : '❌ MISSING'}`);

  // Find duplicates
  const duplicateProducts = findDuplicates(products, 'name', 'categoryType');
  if (duplicateProducts.length > 0) {
    console.log('\n⚠️  Duplicate Products:');
    duplicateProducts.forEach(({ name, categoryType, ids }) => {
      console.log(`  "${name}" (${categoryType}): ${ids.length} copies`);
    });
  }

  const duplicateProviders = findDuplicates(providers, 'name', 'categoryType');
  if (duplicateProviders.length > 0) {
    console.log('\n⚠️  Duplicate Providers:');
    duplicateProviders.forEach(({ name, categoryType, ids }) => {
      console.log(`  "${name}" (${categoryType}): ${ids.length} copies`);
    });
  }

  return {
    categories,
    products,
    providers,
    hasRealEstate,
    duplicateProducts,
    duplicateProviders,
  };
}

function findDuplicates(items, ...keys) {
  const seen = new Map();
  const duplicates = [];

  items.forEach((item) => {
    const key = keys.map((k) => item[k]).join('|');
    if (!seen.has(key)) {
      seen.set(key, [item]);
    } else {
      seen.get(key).push(item);
    }
  });

  seen.forEach((items, key) => {
    if (items.length > 1) {
      const [name, categoryType] = key.split('|');
      duplicates.push({
        name,
        categoryType,
        ids: items.map((i) => i.id),
        items,
      });
    }
  });

  return duplicates;
}

async function removeDuplicateProducts() {
  console.log('\n🧹 Removing duplicate products...');

  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found!');
    return;
  }

  const products = await catalogService.getAllProducts(true);
  const duplicates = findDuplicates(products, 'name', 'categoryType');

  if (duplicates.length === 0) {
    console.log('✓ No product duplicates found');
    return { removed: 0 };
  }

  let removedCount = 0;

  for (const dup of duplicates) {
    console.log(`\n  Processing "${dup.name}" (${dup.categoryType})...`);

    // Sort by updatedAt (keep newest)
    dup.items.sort((a, b) => {
      const aTime = new Date(a.metadata.updatedAt || a.metadata.createdAt).getTime();
      const bTime = new Date(b.metadata.updatedAt || b.metadata.createdAt).getTime();
      return bTime - aTime;
    });

    const toKeep = dup.items[0];
    const toRemove = dup.items.slice(1);

    console.log(`    Keep: ${toKeep.id} (newest)`);

    for (const product of toRemove) {
      try {
        await catalogService.deleteProduct(product.id);
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

async function removeDuplicateProviders() {
  console.log('\n🧹 Removing duplicate providers...');

  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found!');
    return;
  }

  const providers = await catalogService.getAllProviders(true);
  const duplicates = findDuplicates(providers, 'name', 'categoryType');

  if (duplicates.length === 0) {
    console.log('✓ No provider duplicates found');
    return { removed: 0 };
  }

  let removedCount = 0;

  for (const dup of duplicates) {
    console.log(`\n  Processing "${dup.name}" (${dup.categoryType})...`);

    dup.items.sort((a, b) => {
      const aTime = new Date(a.metadata.updatedAt || a.metadata.createdAt).getTime();
      const bTime = new Date(b.metadata.updatedAt || b.metadata.createdAt).getTime();
      return bTime - aTime;
    });

    const toKeep = dup.items[0];
    const toRemove = dup.items.slice(1);

    console.log(`    Keep: ${toKeep.id}`);

    for (const provider of toRemove) {
      try {
        await catalogService.deleteProvider(provider.id);
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

async function restoreRealEstateCategory() {
  console.log('\n🏠 Restoring realEstate category...');

  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found!');
    return;
  }

  try {
    await catalogService.getCategoryByType('realEstate');
    console.log('✓ RealEstate category already exists');
    return { restored: false };
  } catch (error) {
    // Not found, create it
  }

  try {
    await catalogService.createCategory({
      type: 'realEstate',
      displayName: 'Immobilien',
      provisionType: 'realEstate',
      requiresPropertyAddress: true,
      order: 2,
    });

    console.log('✅ RealEstate category restored');
    return { restored: true };
  } catch (error) {
    console.error('❌ Failed to restore:', error);
    return { restored: false, error: error.message };
  }
}

async function cleanupCatalog() {
  console.log('\n🚀 Starting catalog cleanup...\n');
  console.log('='.repeat(60));

  // Step 1: Analyze
  const analysis = await analyzeCatalog();
  if (!analysis) return;

  console.log('\n' + '='.repeat(60));

  // Step 2: Remove duplicates
  if (analysis.duplicateProducts.length > 0) {
    await removeDuplicateProducts();
  }

  if (analysis.duplicateProviders.length > 0) {
    await removeDuplicateProviders();
  }

  // Step 3: Restore missing category
  if (!analysis.hasRealEstate) {
    await restoreRealEstateCategory();
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Cleanup completed!');
  console.log('\nRe-analyzing...\n');

  // Final analysis
  await analyzeCatalog();

  console.log('\n💡 Refresh the page to see changes in the UI.');
}

// Expose functions globally
window.catalogCleanup = {
  analyze: analyzeCatalog,
  removeDuplicateProducts,
  removeDuplicateProviders,
  restoreRealEstate: restoreRealEstateCategory,
  fullCleanup: cleanupCatalog,
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║              CATALOG CLEANUP SCRIPT LOADED                 ║
╚════════════════════════════════════════════════════════════╝

Available commands:

  await catalogCleanup.analyze()              - Analyze catalog
  await catalogCleanup.removeDuplicateProducts() - Remove product duplicates
  await catalogCleanup.removeDuplicateProviders() - Remove provider duplicates
  await catalogCleanup.restoreRealEstate()    - Restore realEstate category
  await catalogCleanup.fullCleanup()          - Run full cleanup

Quick start:
  await catalogCleanup.fullCleanup()

`);
