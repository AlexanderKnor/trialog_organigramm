/**
 * Logger Utility
 * Environment-aware logging with production optimization
 *
 * Usage:
 *   import { Logger } from './core/utils/logger.js';
 *   Logger.log('Debug message');
 *   Logger.warn('Warning message');
 *   Logger.error('Error message', errorObject);
 */

/**
 * Determine if running in production
 * Checks multiple indicators for environment detection
 */
function isProduction() {
  // Check common environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
  }

  // Check hostname (production domains)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' &&
           hostname !== '127.0.0.1' &&
           !hostname.startsWith('192.168.');
  }

  // Default to development for safety
  return false;
}

/**
 * Log levels for filtering
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * Logger Configuration
 */
class LoggerConfig {
  static #instance = null;
  #minLevel = LogLevel.DEBUG;
  #isProduction = isProduction();
  #enabledInProduction = false;

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new LoggerConfig();
    }
    return this.#instance;
  }

  setMinLevel(level) {
    this.#minLevel = level;
  }

  getMinLevel() {
    return this.#minLevel;
  }

  isProd() {
    return this.#isProduction;
  }

  enableInProduction(enabled = true) {
    this.#enabledInProduction = enabled;
  }

  shouldLog(level) {
    // Always log errors
    if (level >= LogLevel.ERROR) {
      return true;
    }

    // In production, only log if explicitly enabled
    if (this.#isProduction && !this.#enabledInProduction) {
      return false;
    }

    // Check minimum level
    return level >= this.#minLevel;
  }
}

/**
 * Logger Class
 * Provides environment-aware logging with filtering
 */
export class Logger {
  static #config = LoggerConfig.getInstance();

  /**
   * Configure logger settings
   */
  static configure(options = {}) {
    if (options.minLevel !== undefined) {
      this.#config.setMinLevel(options.minLevel);
    }
    if (options.enableInProduction !== undefined) {
      this.#config.enableInProduction(options.enableInProduction);
    }
  }

  /**
   * Debug logging (suppressed in production)
   */
  static log(...args) {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.log(...args);
    }
  }

  /**
   * Info logging (suppressed in production)
   */
  static info(...args) {
    if (this.#config.shouldLog(LogLevel.INFO)) {
      console.info(...args);
    }
  }

  /**
   * Warning logging (suppressed in production unless enabled)
   */
  static warn(...args) {
    if (this.#config.shouldLog(LogLevel.WARN)) {
      console.warn(...args);
    }
  }

  /**
   * Error logging (always logged)
   * In production, can be integrated with error tracking (Sentry, etc.)
   */
  static error(...args) {
    // Always log errors to console
    console.error(...args);

    // In production, send to error tracking service
    if (this.#config.isProd()) {
      this.#reportToErrorTracking(args);
    }
  }

  /**
   * Group logging (for nested logs)
   */
  static group(label, ...args) {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.group(label, ...args);
    }
  }

  static groupEnd() {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  /**
   * Table logging (for data visualization)
   */
  static table(data) {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }

  /**
   * Time tracking
   */
  static time(label) {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  static timeEnd(label) {
    if (this.#config.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  /**
   * Assert logging
   */
  static assert(condition, ...args) {
    if (this.#config.shouldLog(LogLevel.ERROR)) {
      console.assert(condition, ...args);
    }
  }

  /**
   * Get environment info
   */
  static getEnvironment() {
    return {
      isProduction: this.#config.isProd(),
      minLevel: this.#config.getMinLevel(),
    };
  }

  /**
   * Report error to tracking service
   * Override this method to integrate with Sentry, LogRocket, etc.
   */
  static #reportToErrorTracking(args) {
    // TODO: Integrate with error tracking service
    // Example: Sentry.captureException(args[0]);

    // For now, just store in sessionStorage for debugging
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
        errors.push({
          timestamp: new Date().toISOString(),
          message: args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
        });
        // Keep only last 50 errors
        sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-50)));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Get logged errors (for debugging)
   */
  static getLoggedErrors() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        return JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  /**
   * Clear logged errors
   */
  static clearLoggedErrors() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('app_errors');
    }
  }
}

/**
 * Export default instance for convenience
 */
export default Logger;
