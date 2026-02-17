/**
 * Value Object: BillingExclusionRule
 * Determines whether a revenue entry should be excluded from billing reports
 * based on GewO (Gewerbeordnung) classification.
 *
 * Background: Revenues under §34i (Baufinanzierung), §34c (Privatkredite),
 * and §34d (Versicherungen) are paid directly by the product provider to the
 * partner. Only explicitly whitelisted combinations go through system billing.
 *
 * Rule:
 *  - ALL entries are EXCLUDED by default (direct payment to partner)
 *  - bank + Gewerbekredit -> INCLUDED (only exception, billed through system)
 *
 * This applies equally to own entries, team/hierarchy entries, and
 * tip-provider entries.
 */

/**
 * Specific category+product combinations that are INCLUDED in billing
 * (whitelisted). Everything else is excluded. Matched case-insensitively.
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
   * for billing despite its category being excluded.
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
   * Determine if a category+product combination should be excluded from billing.
   * @param {string} categoryType
   * @param {string} productName
   * @returns {boolean} true if the entry must be excluded
   */
  static shouldExclude(categoryType, productName) {
    if (!categoryType) return false;

    // Only whitelisted combinations pass through to billing
    return !BillingExclusionRule.isIncluded(categoryType, productName);
  }

  /**
   * Extract categoryType and productName from any entry type
   * (RevenueEntry or HierarchicalRevenueEntry).
   *
   * HierarchicalRevenueEntry is detected by its `originalEntry` accessor.
   * @param {object} entry
   * @returns {{ categoryType: string|undefined, productName: string|undefined }}
   */
  static extractEntryData(entry) {
    const source = entry.originalEntry || entry;
    const categoryType = source.category?.type || source.category;
    const productName = source.product?.name || source.product;
    return { categoryType, productName };
  }

  /**
   * Convenience method: determine if a full entry object should be excluded.
   * Works with RevenueEntry, HierarchicalRevenueEntry, and tip-provider entries.
   * @param {object} entry
   * @returns {boolean}
   */
  static shouldExcludeEntry(entry) {
    const { categoryType, productName } = BillingExclusionRule.extractEntryData(entry);
    return BillingExclusionRule.shouldExclude(categoryType, productName);
  }
}
