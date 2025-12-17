/**
 * Firebase Configuration
 * Configuration for Firebase services (Auth, Firestore, Analytics)
 */

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAviPaC0YQwJfNRXyTqD4Paph01LarAz4s',
  authDomain: 'trialog-8a95b.firebaseapp.com',
  projectId: 'trialog-8a95b',
  storageBucket: 'trialog-8a95b.firebasestorage.app',
  messagingSenderId: '279927253519',
  appId: '1:279927253519:web:55774d2db8e0495341d17a',
  measurementId: 'G-HBXYMMYQCZ',
};

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  HIERARCHY_TREES: 'hierarchy_trees',
  TRACKING_EVENTS: 'tracking_events',
  REVENUE_ENTRIES: 'revenue_entries',
  PRODUCT_CATALOG: 'product_catalog',
};

export const AUTH_CONFIG = {
  persistence: 'LOCAL', // LOCAL, SESSION, or NONE
  enableOfflinePersistence: true,
  cacheSizeBytes: 40 * 1024 * 1024, // 40MB
};

export const SYNC_CONFIG = {
  enableRealtime: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};
