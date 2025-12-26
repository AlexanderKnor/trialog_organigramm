/**
 * Migration Script: Add Provision Snapshots to Existing Revenue Entries
 *
 * Purpose:
 * This script adds provision snapshots (ownerProvisionSnapshot, managerProvisionSnapshot, hierarchySnapshot)
 * to all existing revenue entries that don't have them yet.
 *
 * Why this is needed:
 * - New revenue entries automatically capture provision snapshots at creation time
 * - Old entries (created before this feature) don't have snapshots
 * - Without snapshots, they use dynamic calculation which can change retroactively
 *
 * How to use:
 * 1. Open the app in your browser and login as admin
 * 2. Open browser console (F12 or Ctrl+Shift+I)
 * 3. Copy and paste this entire script into the console
 * 4. Run: await provisionSnapshotMigration.migrate()
 *
 * Safety:
 * - Only updates entries that don't have snapshots yet (idempotent)
 * - Captures CURRENT provision values (best we can do for historical data)
 * - Does not modify provision amounts or other entry data
 * - Can be run multiple times safely
 */

const provisionSnapshotMigration = {
  /**
   * Main migration function
   */
  async migrate() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     PROVISION SNAPSHOT MIGRATION - STARTING                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      // Get access to app services
      const { app } = await import('../src/main.js');
      const revenueService = app.revenueService;
      const hierarchyService = app.hierarchyService;

      if (!revenueService || !hierarchyService) {
        throw new Error('Services not available. Make sure you are logged in.');
      }

      // Get the main tree
      const { APP_CONFIG } = await import('../src/core/config/index.js');
      const tree = await hierarchyService.getTree(APP_CONFIG.mainTreeId);

      if (!tree) {
        throw new Error('Could not load organization tree');
      }

      console.log(`✓ Loaded tree: ${tree.name} (${tree.getAllNodes().length} nodes)`);
      console.log('');

      // Get all revenue entries
      console.log('📊 Loading all revenue entries...');
      const allEntries = await this.#getAllEntries(revenueService, tree);
      console.log(`✓ Found ${allEntries.length} total revenue entries`);
      console.log('');

      // Filter entries that need migration
      const entriesToMigrate = allEntries.filter(entry => !entry.hasProvisionSnapshot);
      const alreadyMigrated = allEntries.length - entriesToMigrate.length;

      console.log(`📈 Migration Status:`);
      console.log(`   Already migrated: ${alreadyMigrated}`);
      console.log(`   Need migration:   ${entriesToMigrate.length}`);
      console.log('');

      if (entriesToMigrate.length === 0) {
        console.log('✅ All entries already have provision snapshots!');
        console.log('   No migration needed.');
        return;
      }

      // Confirm migration
      console.log('⚠️  WARNING: This will capture CURRENT provision values for historical entries.');
      console.log('   If provisions have changed since entry creation, the snapshot will not reflect');
      console.log('   the original values. This is the best we can do for historical data.');
      console.log('');

      const confirmed = confirm(`Migrate ${entriesToMigrate.length} revenue entries?`);
      if (!confirmed) {
        console.log('❌ Migration cancelled by user');
        return;
      }

      // Migrate entries
      console.log('');
      console.log('🚀 Starting migration...');
      console.log('');

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < entriesToMigrate.length; i++) {
        const entry = entriesToMigrate[i];
        const progress = `[${i + 1}/${entriesToMigrate.length}]`;

        try {
          // Capture snapshots
          const snapshots = await this.#captureSnapshots(entry, tree);

          // Update entry with snapshots
          await revenueService.updateEntry(entry.id, snapshots);

          console.log(`${progress} ✓ Migrated: ${entry.customerName} (${entry.id.substring(0, 8)}...)`);
          successCount++;
        } catch (error) {
          console.error(`${progress} ✗ Failed: ${entry.id}`, error.message);
          errorCount++;
          errors.push({ entryId: entry.id, error: error.message });
        }

        // Progress update every 10 entries
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${entriesToMigrate.length} (${Math.round(((i + 1) / entriesToMigrate.length) * 100)}%)`);
        }
      }

      // Summary
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║     PROVISION SNAPSHOT MIGRATION - COMPLETED               ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`✅ Successfully migrated: ${successCount} entries`);
      if (errorCount > 0) {
        console.log(`❌ Failed to migrate:     ${errorCount} entries`);
        console.log('');
        console.log('Errors:');
        errors.forEach(({ entryId, error }) => {
          console.log(`  - ${entryId}: ${error}`);
        });
      }
      console.log('');

    } catch (error) {
      console.error('');
      console.error('❌ Migration failed:', error);
      console.error('');
      throw error;
    }
  },

  /**
   * Get all revenue entries from all employees
   */
  async #getAllEntries(revenueService, tree) {
    const allEntries = [];
    const allNodes = tree.getAllNodes();

    // Also check hardcoded Geschäftsführer
    const geschaeftsfuehrerIds = ['marcel-liebetrau', 'daniel-lippa'];

    for (const node of allNodes) {
      const entries = await revenueService.getEntriesByEmployee(node.id);
      allEntries.push(...entries);
    }

    // Check Geschäftsführer
    for (const gfId of geschaeftsfuehrerIds) {
      const entries = await revenueService.getEntriesByEmployee(gfId);
      allEntries.push(...entries);
    }

    return allEntries;
  },

  /**
   * Capture provision snapshots for an entry
   */
  async #captureSnapshots(entry, tree) {
    // Get owner node
    const owner = tree.getNode(entry.employeeId);
    if (!owner) {
      // Check if it's a Geschäftsführer
      const geschaeftsfuehrerData = {
        'marcel-liebetrau': { id: 'marcel-liebetrau', name: 'Marcel Liebetrau', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
        'daniel-lippa': { id: 'daniel-lippa', name: 'Daniel Lippa', bankProvision: 90, insuranceProvision: 90, realEstateProvision: 90 },
      };

      const gfData = geschaeftsfuehrerData[entry.employeeId];
      if (gfData) {
        // Geschäftsführer snapshot (no manager)
        const provisionType = entry.provisionType || this.#inferProvisionType(entry.category.type);
        const ownerProvision = this.#getProvisionByType(gfData, provisionType);

        return {
          ownerProvisionSnapshot: ownerProvision,
          managerProvisionSnapshot: null,
          hierarchySnapshot: {
            ownerId: gfData.id,
            ownerName: gfData.name,
            managerId: null,
            managerName: null,
            capturedAt: new Date().toISOString(),
            migratedAt: new Date().toISOString(),
          },
        };
      }

      throw new Error(`Employee node ${entry.employeeId} not found in tree`);
    }

    // Get manager node
    const manager = owner.parentId ? tree.getNode(owner.parentId) : null;

    // Get provision type
    const provisionType = entry.provisionType || this.#inferProvisionType(entry.category.type);

    // Get provision rates
    const ownerProvision = this.#getProvisionByType(owner, provisionType);
    const managerProvision = manager ? this.#getProvisionByType(manager, provisionType) : null;

    // Create hierarchy snapshot
    const hierarchySnapshot = {
      ownerId: owner.id,
      ownerName: owner.name,
      managerId: manager?.id || null,
      managerName: manager?.name || null,
      capturedAt: new Date().toISOString(),
      migratedAt: new Date().toISOString(), // Mark as migrated (not captured at creation)
    };

    return {
      ownerProvisionSnapshot: ownerProvision,
      managerProvisionSnapshot: managerProvision,
      hierarchySnapshot,
    };
  },

  /**
   * Get provision by type from employee/node
   */
  #getProvisionByType(employee, provisionType) {
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
  },

  /**
   * Infer provision type from category
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
  },

  /**
   * Quick analysis without migration
   */
  async analyze() {
    console.log('🔍 Analyzing revenue entries...');
    console.log('');

    try {
      const { app } = await import('../src/main.js');
      const revenueService = app.revenueService;
      const hierarchyService = app.hierarchyService;

      const { APP_CONFIG } = await import('../src/core/config/index.js');
      const tree = await hierarchyService.getTree(APP_CONFIG.mainTreeId);

      const allEntries = await this.#getAllEntries(revenueService, tree);

      const withSnapshots = allEntries.filter(e => e.hasProvisionSnapshot).length;
      const withoutSnapshots = allEntries.filter(e => !e.hasProvisionSnapshot).length;

      console.log(`📊 Revenue Entries Summary:`);
      console.log(`   Total entries:          ${allEntries.length}`);
      console.log(`   With snapshots:         ${withSnapshots} ✓`);
      console.log(`   Without snapshots:      ${withoutSnapshots} ⚠`);
      console.log('');

      if (withoutSnapshots > 0) {
        console.log('💡 Run provisionSnapshotMigration.migrate() to add snapshots to old entries');
      } else {
        console.log('✅ All entries have provision snapshots!');
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
    }
  },
};

// Auto-log on load
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      PROVISION SNAPSHOT MIGRATION SCRIPT LOADED            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Available commands:');
console.log('  await provisionSnapshotMigration.analyze()  - Analyze entries');
console.log('  await provisionSnapshotMigration.migrate()  - Migrate entries');
console.log('');

// Make globally available
window.provisionSnapshotMigration = provisionSnapshotMigration;
