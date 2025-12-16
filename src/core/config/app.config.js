/**
 * Application Configuration
 */

export const APP_CONFIG = {
  name: 'Trialog Strukturplan',
  version: '1.0.0',
  company: 'Trialog Maklergruppe GmbH',

  // Single Tree Policy - Fixed ID for the one and only organization tree
  mainTreeId: 'trialog-organization-main',

  storage: {
    prefix: 'trialog_strukturplan_',
    version: 1,
  },
  hierarchy: {
    maxDepth: 10,
    defaultNodeWidth: 200,
    defaultNodeHeight: 80,
    connectionLineWidth: 2,
    animationDuration: 300,
  },
  tracking: {
    autoSaveInterval: 30000,
    maxHistoryItems: 50,
  },
};

export const ENVIRONMENT = {
  isDevelopment: typeof window !== 'undefined' && window.location.hostname === 'localhost',
  isProduction: typeof window !== 'undefined' && window.location.hostname !== 'localhost',
};
