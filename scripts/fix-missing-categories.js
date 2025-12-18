/**
 * Fix Missing Categories Script
 * Ergänzt fehlende Kategorien ohne komplette Neu-Migration
 *
 * USAGE:
 * 1. Als Admin einloggen
 * 2. Browser Console öffnen (F12)
 * 3. Script copy/paste
 * 4. Ausführen: await fixMissingCategories()
 */

async function checkCategories() {
  console.log('🔍 Checking categories...\n');

  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found! Are you logged in as admin?');
    return null;
  }

  const existingCategories = await catalogService.getAllCategories(true);

  console.log('📊 Existing categories:');
  existingCategories.forEach((c) => {
    console.log(`  ✓ ${c.type}: ${c.displayName} (${c.provisionType.type})`);
  });

  // Expected categories
  const expectedCategories = {
    bank: {
      type: 'bank',
      displayName: 'Bank',
      provisionType: 'bank',
      requiresPropertyAddress: false,
      order: 0,
    },
    insurance: {
      type: 'insurance',
      displayName: 'Versicherung',
      provisionType: 'insurance',
      requiresPropertyAddress: false,
      order: 1,
    },
    realEstate: {
      type: 'realEstate',
      displayName: 'Immobilien',
      provisionType: 'realEstate',
      requiresPropertyAddress: true,
      order: 2,
    },
    propertyManagement: {
      type: 'propertyManagement',
      displayName: 'Hausverwaltung',
      provisionType: 'realEstate', // Uses same provision field!
      requiresPropertyAddress: true,
      order: 3,
    },
    energyContracts: {
      type: 'energyContracts',
      displayName: 'Energieverträge',
      provisionType: 'bank', // TODO: Should this be separate?
      requiresPropertyAddress: false,
      order: 4,
    },
  };

  // Find missing
  const existingTypes = new Set(existingCategories.map((c) => c.type));
  const missingCategories = Object.entries(expectedCategories)
    .filter(([type]) => !existingTypes.has(type))
    .map(([type, data]) => data);

  if (missingCategories.length === 0) {
    console.log('\n✅ All categories exist!');
    return { existing: existingCategories, missing: [] };
  }

  console.log('\n⚠️  Missing categories:');
  missingCategories.forEach((c) => {
    console.log(`  ❌ ${c.type}: ${c.displayName}`);
  });

  return { existing: existingCategories, missing: missingCategories };
}

async function createMissingCategories() {
  const catalogService = window.app?.catalogService;
  if (!catalogService) {
    console.error('❌ CatalogService not found!');
    return;
  }

  const check = await checkCategories();
  if (!check || check.missing.length === 0) {
    return;
  }

  console.log('\n🔧 Creating missing categories...\n');

  let created = 0;
  let failed = 0;

  for (const categoryData of check.missing) {
    try {
      console.log(`Creating: ${categoryData.type} (${categoryData.displayName})...`);

      await catalogService.createCategory(categoryData);

      console.log(`  ✅ Created: ${categoryData.displayName}`);
      created++;

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Failed to create ${categoryData.type}:`);
      console.error(`     Error: ${error.message}`);
      console.error(`     Stack:`, error);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Created: ${created} categories`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} categories`);
  }
  console.log('='.repeat(60));

  // Verify
  console.log('\n🔍 Verifying...\n');
  await checkCategories();

  console.log('\n💡 Refresh the page (F5) to see changes in UI.');
}

async function fixMissingCategories() {
  console.log('\n🚀 Starting category fix...\n');
  console.log('='.repeat(60));

  const result = await createMissingCategories();

  console.log('\n✅ Done!');

  return result;
}

// Expose globally
window.fixMissingCategories = fixMissingCategories;
window.checkCategories = checkCategories;

console.log(`
╔════════════════════════════════════════════════════════════╗
║           FIX MISSING CATEGORIES SCRIPT LOADED             ║
╚════════════════════════════════════════════════════════════╝

Commands:

  await checkCategories()          - Check which categories are missing
  await fixMissingCategories()     - Create missing categories

Quick start:
  await fixMissingCategories()

`);
