/**
 * Application Entry Point
 * Trialog Strukturplan - Hierarchy Tracking Tool with Firebase
 */

import { firebaseApp } from './core/firebase/index.js';
import { authService } from './core/auth/index.js';
import { LoginScreen } from './features/auth/presentation/screens/index.js';
import { LocalStorageDataSource } from './features/hierarchy-tracking/data/data-sources/LocalStorageDataSource.js';
import { FirestoreDataSource } from './features/hierarchy-tracking/data/data-sources/FirestoreDataSource.js';
import { LocalHierarchyRepository } from './features/hierarchy-tracking/data/repositories/LocalHierarchyRepository.js';
import { FirebaseHierarchyRepository } from './features/hierarchy-tracking/data/repositories/FirebaseHierarchyRepository.js';
import { LocalTrackingRepository } from './features/hierarchy-tracking/data/repositories/LocalTrackingRepository.js';
import { HierarchyService } from './features/hierarchy-tracking/domain/services/HierarchyService.js';
import { HierarchyScreen } from './features/hierarchy-tracking/presentation/screens/HierarchyScreen.js';
import { RevenueLocalStorageDataSource } from './features/revenue-tracking/data/data-sources/RevenueLocalStorageDataSource.js';
import { RevenueFirestoreDataSource } from './features/revenue-tracking/data/data-sources/RevenueFirestoreDataSource.js';
import { LocalRevenueRepository } from './features/revenue-tracking/data/repositories/LocalRevenueRepository.js';
import { FirebaseRevenueRepository } from './features/revenue-tracking/data/repositories/FirebaseRevenueRepository.js';
import { RevenueService } from './features/revenue-tracking/domain/services/RevenueService.js';
import { RevenueScreen } from './features/revenue-tracking/presentation/screens/RevenueScreen.js';
import { CatalogFirestoreDataSource } from './features/product-catalog/data/data-sources/CatalogFirestoreDataSource.js';
import { FirebaseCatalogRepository } from './features/product-catalog/data/repositories/FirebaseCatalogRepository.js';
import { CatalogService } from './features/product-catalog/domain/services/CatalogService.js';
import { MigrationService } from './features/product-catalog/domain/services/MigrationService.js';
import { CatalogManagementScreen } from './features/product-catalog/presentation/screens/CatalogManagementScreen.js';
import { UserFirestoreDataSource } from './features/user-profile/data/data-sources/UserFirestoreDataSource.js';
import { FirebaseUserRepository } from './features/user-profile/data/repositories/FirebaseUserRepository.js';
import { ProfileService } from './features/user-profile/domain/services/ProfileService.js';
import { ProfileScreen } from './features/user-profile/presentation/screens/ProfileScreen.js';
import { APP_CONFIG } from './core/config/index.js';
import { Logger } from './core/utils/logger.js';

class Application {
  #hierarchyService;
  #revenueService;
  #catalogService;
  #profileService;
  #currentScreen;
  #loginScreen;
  #currentTreeId;
  #isInitialized;
  #isAuthenticated;

  constructor() {
    this.#isInitialized = false;
    this.#isAuthenticated = false;
    this.#currentScreen = null;
    this.#loginScreen = null;
    this.#currentTreeId = null;
  }

  async initialize() {
    if (this.#isInitialized) {
      Logger.warn('Application already initialized');
      return;
    }

    Logger.log(`Initializing ${APP_CONFIG.name} v${APP_CONFIG.version}`);

    try {
      // Initialize Firebase first
      Logger.log('Initializing Firebase...');
      await firebaseApp.initialize();

      // Initialize AuthService
      Logger.log('Initializing Auth Service...');
      await authService.initialize();

      // Wait for first auth state change before showing UI
      let authResolved = false;

      // Listen to auth state changes
      authService.onAuthStateChange((user) => {
        if (!authResolved) {
          authResolved = true;
          this.#removeLoadingScreen();
        }

        if (user) {
          this.#onUserAuthenticated(user);
        } else {
          this.#onUserLoggedOut();
        }
      });

      // Fallback: if auth doesn't resolve in 3 seconds, show login screen
      setTimeout(() => {
        if (!authResolved) {
          Logger.warn('⚠ Auth state timeout - showing login screen');
          authResolved = true;
          this.#removeLoadingScreen();
          this.#showLoginScreen();
        }
      }, 3000);

      this.#isInitialized = true;
      Logger.log('✅ Application initialized - waiting for auth state');
    } catch (error) {
      Logger.error('❌ Failed to initialize application:', error);
      this.#removeLoadingScreen();
      this.#showLoginScreen();
    }
  }

  #removeLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }
  }

  async #initializeServices() {
    Logger.log('Initializing services with Firebase...');

    // Setup Hierarchy Service with Firebase
    const firestoreDataSource = new FirestoreDataSource();
    const hierarchyRepository = new FirebaseHierarchyRepository(firestoreDataSource);

    // Tracking still uses LocalStorage for now (will migrate in Phase 3)
    const localDataSource = new LocalStorageDataSource();
    const trackingRepository = new LocalTrackingRepository(localDataSource);

    this.#hierarchyService = new HierarchyService(hierarchyRepository, trackingRepository, authService);
    Logger.log('✓ Hierarchy Service initialized with Firebase + AuthService');

    // Setup Revenue Service with Firebase
    const revenueFirestoreDataSource = new RevenueFirestoreDataSource();
    const revenueRepository = new FirebaseRevenueRepository(revenueFirestoreDataSource);
    this.#revenueService = new RevenueService(revenueRepository, this.#hierarchyService);
    Logger.log('✓ Revenue Service initialized with Firebase');

    // Setup routing
    this.#setupRouting();

    // Handle initial route
    await this.#handleRoute();
  }

  async #onUserAuthenticated(user) {
    // Prevent re-entry if already processing authentication
    if (this.#isAuthenticated) {
      return;
    }

    Logger.log('✓ User authenticated:', user.email, `(${user.role})`);

    // Hide login screen if showing
    if (this.#loginScreen) {
      this.#loginScreen.unmount();
      this.#loginScreen = null;
    }

    // Keep loading screen visible during initialization
    // Will be removed after first render completes

    // Initialize services WITHOUT routing (to prevent premature tree rendering)
    if (!this.#hierarchyService) {
      Logger.log('Initializing services with Firebase...');

      // Initialize Hierarchy Service
      const firestoreDataSource = new FirestoreDataSource();
      const hierarchyRepository = new FirebaseHierarchyRepository(firestoreDataSource);
      const localDataSource = new LocalStorageDataSource();
      const trackingRepository = new LocalTrackingRepository(localDataSource);

      this.#hierarchyService = new HierarchyService(hierarchyRepository, trackingRepository, authService);
      Logger.log('✓ Hierarchy Service initialized with Firebase + AuthService');

      // Initialize Catalog Service (needed by RevenueService)
      const catalogFirestoreDataSource = new CatalogFirestoreDataSource();
      const catalogRepository = new FirebaseCatalogRepository(catalogFirestoreDataSource);
      this.#catalogService = new CatalogService(catalogRepository, null); // RevenueService will be set later
      Logger.log('✓ Catalog Service initialized with Firebase');

      // Initialize Revenue Service (with CatalogService dependency)
      const revenueFirestoreDataSource = new RevenueFirestoreDataSource();
      const revenueRepository = new FirebaseRevenueRepository(revenueFirestoreDataSource);
      this.#revenueService = new RevenueService(revenueRepository, this.#hierarchyService, this.#catalogService);
      Logger.log('✓ Revenue Service initialized with Firebase + CatalogService');

      // Link CatalogService back to RevenueService (circular dependency resolution)
      this.#catalogService.setRevenueService(this.#revenueService);
      Logger.log('✓ Circular dependency resolved: CatalogService ↔ RevenueService');

      // Initialize Profile Service
      const userFirestoreDataSource = new UserFirestoreDataSource();
      const userRepository = new FirebaseUserRepository(userFirestoreDataSource);
      this.#profileService = new ProfileService(userRepository);
      Logger.log('✓ Profile Service initialized with Firebase');

      // Run automatic migration (only on first app start)
      await this.#runCatalogMigration();

      // Setup routing
      this.#setupRouting();
    }

    // Link employee to their node BEFORE rendering
    if (user.role === 'employee' && user.email && !authService.getLinkedNodeId()) {
      await this.#linkEmployeeToNode(user.email);
    }

    this.#isAuthenticated = true;

    // NOW navigate to main app (after linking is complete)
    if (!window.location.hash) {
      window.location.hash = '';
    }
    await this.#handleRoute();

    // Remove loading screen after first render completes
    await this.#wait(200);
    this.#removeLoadingScreen();
  }

  async #runCatalogMigration() {
    try {
      Logger.log('🔄 Checking catalog migration status...');

      const migrationService = new MigrationService(this.#catalogService);
      const result = await migrationService.migrateHardcodedData();

      if (result.skipped) {
        Logger.log('✓ Catalog migration skipped:', result.reason);
      } else if (result.success) {
        Logger.log(`✅ Catalog migration completed:`, {
          categories: result.categories,
          products: result.products,
          providers: result.providers,
        });
      } else {
        Logger.error('❌ Catalog migration failed:', result.error);
      }
    } catch (error) {
      Logger.error('Failed to run catalog migration:', error);
      // Don't block app initialization if migration fails
    }
  }

  async #linkEmployeeToNode(email) {
    try {
      // Single Tree Policy: Get THE main organization tree (should only be one)
      const allTrees = await this.#hierarchyService.getAllTrees();

      if (allTrees.length === 0) {
        Logger.warn('⚠ No trees found in database');
        return;
      }

      const tree = allTrees[0]; // Get the first (and should be only) tree
      const normalizedEmail = email.toLowerCase().trim();

      Logger.log(`🔍 Searching for node with email: ${email} in tree: ${tree.id}`);

      const allNodes = tree.getAllNodes();
      Logger.log(`  Searching: ${tree.name} (${allNodes.length} nodes)`);

      for (const node of allNodes) {
        const nodeEmail = node.email?.toLowerCase().trim();

        if (nodeEmail) {
          Logger.log(`    Node: ${node.name}, Email: ${node.email}`);
        }

        if (nodeEmail && nodeEmail === normalizedEmail) {
          authService.setLinkedNodeId(node.id);
          Logger.log(`✓ Employee linked to node: ${node.name} (${node.id})`);
          return;
        }
      }

      Logger.warn(`⚠ No node found with email: ${email}`);
      Logger.warn('💡 Stelle sicher, dass die Email im Mitarbeiter-Profil exakt mit der Login-Email übereinstimmt.');
    } catch (error) {
      Logger.error('Failed to link employee to node:', error);
    }
  }

  #onUserLoggedOut() {
    Logger.log('User logged out');
    this.#isAuthenticated = false;

    // Clean up current screen
    if (this.#currentScreen) {
      this.#currentScreen.unmount();
      this.#currentScreen = null;
    }

    // Show login screen
    this.#showLoginScreen();
  }

  #showLoginScreen() {
    const appContainer = document.querySelector('#app');
    if (!appContainer) return;

    // Clear loading screen
    const loadingScreen = appContainer.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }

    // Clear any existing content
    appContainer.innerHTML = '';

    // Show login screen
    this.#loginScreen = new LoginScreen(appContainer, () => {
      // Login success callback (handled by auth state change)
    });
    this.#loginScreen.mount();
  }

  #setupRouting() {
    window.addEventListener('hashchange', () => {
      this.#handleRoute();
    });

    // Expose navigation functions globally for components
    window.navigateToRevenue = (employeeId, treeId) => {
      this.#currentTreeId = treeId;
      window.location.hash = `revenue/${employeeId}/${treeId}`;
    };

    window.navigateToCatalog = () => {
      window.location.hash = 'catalog';
    };

    window.navigateToProfile = () => {
      window.location.hash = 'profile';
    };
  }

  async #handleRoute() {
    const hash = window.location.hash.slice(1);
    const parts = hash.split('/');
    const appContainer = document.querySelector('#app');

    // SECURITY GUARD: Verify user still exists before showing ANY screen
    const isUserValid = await authService.verifyCurrentUser();
    if (!isUserValid) {
      Logger.error('🔒 SECURITY: User verification failed - redirecting to login');
      this.#hideTransitionOverlay();
      return; // Auth state change will trigger login screen
    }

    // Show loading overlay instantly
    this.#showTransitionOverlay();

    // Wait for overlay to be fully visible
    await this.#wait(150);

    // Unmount current screen
    if (this.#currentScreen) {
      this.#currentScreen.unmount();
      this.#currentScreen = null;
    }

    // Mount new screen (data loading happens here)
    if (parts[0] === 'revenue' && parts[1] && parts[2]) {
      const employeeId = parts[1];
      const treeId = parts[2];
      await this.#showRevenueScreen(employeeId, treeId);
    } else if (parts[0] === 'catalog') {
      await this.#showCatalogScreen();
    } else if (parts[0] === 'profile') {
      await this.#showProfileScreen();
    } else {
      await this.#showHierarchyScreen();
    }

    // Wait a moment for rendering to complete
    await this.#wait(100);

    // Remove loading overlay with smooth fade
    this.#hideTransitionOverlay();
  }

  #showTransitionOverlay() {
    let overlay = document.querySelector('.transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'transition-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(overlay);
    }
    setTimeout(() => overlay.classList.add('visible'), 10);
  }

  #hideTransitionOverlay() {
    const overlay = document.querySelector('.transition-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  #wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async #showHierarchyScreen() {
    // SECURITY: Verify authentication before showing screen
    if (!authService.isAuthenticated()) {
      Logger.error('🔒 SECURITY: Not authenticated - redirecting to login');
      window.location.hash = '';
      return;
    }

    this.#currentScreen = new HierarchyScreen('#app', this.#hierarchyService, this.#revenueService, this.#profileService);
    await this.#currentScreen.mount();
  }

  async #showRevenueScreen(employeeId, treeId) {
    // SECURITY: Verify authentication before showing screen
    if (!authService.isAuthenticated()) {
      Logger.error('🔒 SECURITY: Not authenticated - redirecting to login');
      window.location.hash = '';
      return;
    }

    // SECURITY: Employees can only view their own revenue
    if (authService.isEmployee()) {
      const linkedNodeId = authService.getLinkedNodeId();
      if (linkedNodeId !== employeeId) {
        Logger.error('🔒 SECURITY: Employee attempting to access other employee revenue - denied');
        window.location.hash = '';
        return;
      }
    }

    this.#currentScreen = new RevenueScreen(
      '#app',
      this.#revenueService,
      this.#hierarchyService,
      employeeId,
      treeId,
      this.#profileService,
    );
    await this.#currentScreen.mount();
  }

  async #showCatalogScreen() {
    // SECURITY: Only admins can access catalog management
    if (!authService.isAdmin()) {
      Logger.error('🔒 SECURITY: Access denied - Catalog management requires admin role');
      window.location.hash = '';
      return;
    }

    this.#currentScreen = new CatalogManagementScreen('#app', this.#catalogService);
    await this.#currentScreen.mount();
  }

  async #showProfileScreen() {
    // SECURITY: Verify authentication
    if (!authService.isAuthenticated()) {
      Logger.error('🔒 SECURITY: Not authenticated - redirecting to login');
      window.location.hash = '';
      return;
    }

    const currentUser = authService.getCurrentUser();
    this.#currentScreen = new ProfileScreen('#app', this.#profileService, currentUser.uid);
    await this.#currentScreen.mount();
  }

  destroy() {
    if (this.#currentScreen) {
      this.#currentScreen.unmount();
    }
    this.#isInitialized = false;
  }

  get hierarchyService() {
    return this.#hierarchyService;
  }

  get revenueService() {
    return this.#revenueService;
  }

  get catalogService() {
    return this.#catalogService;
  }
}

const app = new Application();

document.addEventListener('DOMContentLoaded', () => {
  app.initialize().catch((error) => {
    Logger.error('Failed to initialize application:', error);
  });
});

export { app };
