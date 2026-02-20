/**
 * Currency Utilities
 * Provides reliable rounding for monetary values, avoiding IEEE-754 floating-point issues.
 *
 * Problem: Math.round(106.785 * 100) / 100 = 106.78 (wrong!)
 *   because 106.785 * 100 = 10678.499999... in binary floating-point.
 *
 * Solution: String-based shift avoids intermediate binary multiplication.
 *   Number('106.785e2') = 10678.5 (exact), Math.round(10678.5) = 10679.
 */

/**
 * Round a value to 2 decimal places (currency precision).
 * Uses string-based decimal shift to avoid floating-point multiplication errors.
 * @param {number} value - The value to round
 * @returns {number} Value rounded to 2 decimal places
 */
export function roundCurrency(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 0;
  return Number(Math.round(value + 'e2') + 'e-2');
}
