/**
 * Firebase Application Initialization
 * Singleton pattern for Firebase app instance
 */

import { FIREBASE_CONFIG, AUTH_CONFIG } from '../config/firebase.config.js';
import { Logger } from './../../core/utils/logger.js';

class FirebaseApp {
  #app = null;
  #auth = null;
  #firestore = null;
  #analytics = null;
  #initialized = false;

  async initialize() {
    if (this.#initialized) {
      return;
    }

    try {
      // Check if Firebase SDK is loaded
      if (!window.firebaseSDK) {
        throw new Error('Firebase SDK not loaded. Please check index.html.');
      }

      const { initializeApp, getAuth, getFirestore, getAnalytics } = window.firebaseSDK;

      // Initialize Firebase
      this.#app = initializeApp(FIREBASE_CONFIG);
      Logger.log('✓ Firebase App initialized');

      // Initialize Auth
      this.#auth = getAuth(this.#app);

      // Set persistence for auth session
      const { setPersistence, browserLocalPersistence } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
      );
      await setPersistence(this.#auth, browserLocalPersistence);
      Logger.log('✓ Firebase Auth initialized with LOCAL persistence');

      // Initialize Firestore
      this.#firestore = getFirestore(this.#app);

      // Enable offline persistence
      if (AUTH_CONFIG.enableOfflinePersistence) {
        try {
          const { enableIndexedDbPersistence } = await import(
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
          );

          await enableIndexedDbPersistence(this.#firestore, {
            cacheSizeBytes: AUTH_CONFIG.cacheSizeBytes,
          });
          Logger.log('✓ Firestore offline persistence enabled');
        } catch (err) {
          if (err.code === 'failed-precondition') {
            Logger.warn('⚠ Multiple tabs open, persistence enabled in first tab only');
          } else if (err.code === 'unimplemented') {
            Logger.warn('⚠ Browser does not support offline persistence');
          } else {
            Logger.error('Failed to enable persistence:', err);
          }
        }
      }

      // Initialize Analytics (optional)
      try {
        this.#analytics = getAnalytics(this.#app);
        Logger.log('✓ Firebase Analytics initialized');
      } catch (err) {
        Logger.warn('Analytics not initialized:', err.message);
      }

      this.#initialized = true;
      Logger.log('✅ Firebase fully initialized');
    } catch (error) {
      Logger.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  get app() {
    if (!this.#initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.#app;
  }

  get auth() {
    if (!this.#initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.#auth;
  }

  get firestore() {
    if (!this.#initialized) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.#firestore;
  }

  get analytics() {
    return this.#analytics;
  }

  get isInitialized() {
    return this.#initialized;
  }
}

// Singleton instance
export const firebaseApp = new FirebaseApp();
