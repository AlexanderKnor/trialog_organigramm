/**
 * Value Object: BillingExclusionRule
 * Determines whether a revenue entry should be excluded from billing reports.
 *
 * Three independent exclusion rules (evaluated in order):
 *
 * Rule A – Source-based (unconditional, applies to ALL users):
 *   WIFO CSV import entries are always excluded. The product provider pays
 *   the partner directly regardless of category or product.
 *
 * Rule B – Category-based (unconditional, applies to ALL users):
 *   Insurance ("Versicherung") entries are always excluded. The product
 *   provider pays the partner directly regardless of the import source.
 *
 * Rule C – GewO-based (conditional, only §34c/§34i employees):
 *   When the employee holds §34c or §34i GewO registrations, ALL remaining
 *   entries are excluded except bank + Gewerbekredit (whitelisted).
 *
 * All rules apply equally to own entries, team/hierarchy entries, and
 * tip-provider entries.
 */

/**
 * Source identifier for WIFO CSV imports (set on RevenueEntry.source).
 */
const WIFO_IMPORT_SOURCE = 'wifo_import';

/**
 * Category type that is always excluded from billing (direct payment).
 */
const ALWAYS_EXCLUDED_CATEGORY = 'insurance';

/**
 * Specific category+product combinations that are INCLUDED in billing
 * (whitelisted) when GewO-based exclusion (Rule C) applies.
 * Everything else is excluded. Matched case-insensitively on product name.
 */
const BILLING_INCLUSIONS = [
  { category: 'bank', product: 'gewerbekredit' },
];

/**
 * Normalize a product name for comparison (lowercase, trimmed).
 */
const normalizeProduct = (name) => (name || '').trim().toLowerCase();

export class BillingExclusionRule {
  /**
   * Check whether a category+product combination is explicitly whitelisted
   * for billing despite GewO-based exclusion (Rule C).
   * @param {string} categoryType
   * @param {string} productName
   * @returns {boolean}
   */
  static isIncluded(categoryType, productName) {
    const normalized = normalizeProduct(productName);
    return BILLING_INCLUSIONS.some(
      (inc) => inc.category === categoryType && inc.product === normalized,
    );
  }

  /**
   * Determine if an entry should be excluded from billing.
   *
   * Evaluation order:
   *  1. Rule A: WIFO import → always excluded
   *  2. Rule B: Insurance category → always excluded
   *  3. Rule C: §34c/§34i employee → excluded unless whitelisted
   *
   * @param {string} categoryType
   * @param {string} productName
   * @param {boolean} hasDirectPaymentGewo - true if employee has §34c/§34i
   * @param {string|null} entrySource - the entry's import source identifier
   * @returns {boolean} true if the entry must be excluded
   */
  static shouldExclude(categoryType, productName, hasDirectPaymentGewo = false, entrySource = null) {
    // Rule A: WIFO imports are always excluded (direct payment to partner)
    if (entrySource === WIFO_IMPORT_SOURCE) return true;

    // Rule B: Insurance entries are always excluded (direct payment to partner)
    if (categoryType === ALWAYS_EXCLUDED_CATEGORY) return true;

    // Rule C: GewO-based exclusion (only for §34c/§34i employees)
    if (!categoryType) return false;
    if (!hasDirectPaymentGewo) return false;

    return !BillingExclusionRule.isIncluded(categoryType, productName);
  }

  /**
   * Extract categoryType, productName, and entrySource from any entry type
   * (RevenueEntry or HierarchicalRevenueEntry).
   *
   * HierarchicalRevenueEntry is detected by its `originalEntry` accessor.
   * @param {object} entry
   * @returns {{ categoryType: string|undefined, productName: string|undefined, entrySource: string|null }}
   */
  static extractEntryData(entry) {
    const sourceEntry = entry.originalEntry || entry;
    const categoryType = sourceEntry.category?.type || sourceEntry.category;
    const productName = sourceEntry.product?.name || sourceEntry.product;
    const entrySource = sourceEntry.source || null;
    const manualBilling = sourceEntry.manualBilling || false;
    return { categoryType, productName, entrySource, manualBilling };
  }

  /**
   * Convenience method: determine if a full entry object should be excluded.
   * Works with RevenueEntry, HierarchicalRevenueEntry, and tip-provider entries.
   * @param {object} entry
   * @param {boolean} hasDirectPaymentGewo - true if employee has §34c/§34i
   * @returns {boolean}
   */
  static shouldExcludeEntry(entry, hasDirectPaymentGewo = false) {
    const { categoryType, productName, entrySource, manualBilling } =
      BillingExclusionRule.extractEntryData(entry);
    if (manualBilling) return false;
    return BillingExclusionRule.shouldExclude(
      categoryType, productName, hasDirectPaymentGewo, entrySource,
    );
  }
}
