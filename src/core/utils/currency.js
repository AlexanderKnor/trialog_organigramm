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
  const abs = Math.abs(value);
  // Sub-cent magnitudes round to 0. This guard also keeps the string-shift trick
  // below out of exponential-notation territory (e.g. 1e-7 -> '1e-7e2' -> NaN).
  if (abs < 0.005) return 0;
  // Round away from zero so negative amounts (clawbacks) are not rounded in the
  // company's favour. abs stringifies as a plain decimal here, never exponential.
  const rounded = Number(Math.round(abs + 'e2') + 'e-2');
  return value < 0 ? -rounded : rounded;
}
