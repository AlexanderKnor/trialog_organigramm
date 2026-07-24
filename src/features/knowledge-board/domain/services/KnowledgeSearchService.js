/**
 * Domain Service: KnowledgeSearchService
 * Pure search over already-loaded entries. No I/O — the board holds every entry
 * in memory anyway, so filtering here avoids a query per keystroke.
 *
 * Substring matching rather than fuzzy: the FuzzyMatcher in wifo-import is built
 * for person names (it splits first/last names), and edit distance over a long
 * description produces noise rather than tolerance.
 */

/** Field weights. A title hit outranks a description hit; ranking beats filtering
 *  alone, which would leave a passing mention above the entry that is actually about it. */
const FIELD_WEIGHTS = Object.freeze({
  title: 3,
  partnerName: 2,
  tags: 2,
  description: 1,
  links: 1,
});

export class KnowledgeSearchService {
  /**
   * Lower-cases and strips diacritics so "Rückkauf" and "ruckkauf" both match.
   *
   * @param {*} value
   * @returns {string}
   */
  static normalize(value) {
    return (value || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  /**
   * @param {string} query
   * @returns {string[]} normalized, non-empty search terms
   */
  static parseTerms(query) {
    return KnowledgeSearchService.normalize(query).split(/\s+/).filter(Boolean);
  }

  /**
   * @param {import('../entities/KnowledgeEntry.js').KnowledgeEntry} entry
   * @returns {Object<string, string>} one normalized haystack per weighted field
   */
  static #buildFields(entry) {
    return {
      title: KnowledgeSearchService.normalize(entry.title),
      partnerName: KnowledgeSearchService.normalize(entry.partnerName),
      tags: KnowledgeSearchService.normalize(entry.tags.join(' ')),
      description: KnowledgeSearchService.normalize(entry.description),
      links: KnowledgeSearchService.normalize(entry.links.map((link) => link.label).join(' ')),
    };
  }

  /**
   * Every term must appear somewhere (AND), and the score is the best field each
   * term lands in. An entry matching two terms in the title beats one matching
   * them across title and description.
   *
   * @param {import('../entities/KnowledgeEntry.js').KnowledgeEntry} entry
   * @param {string[]} terms
   * @returns {number} 0 when the entry does not match all terms
   */
  static score(entry, terms) {
    const fields = KnowledgeSearchService.#buildFields(entry);
    let total = 0;

    for (const term of terms) {
      let best = 0;

      for (const [field, haystack] of Object.entries(fields)) {
        if (haystack.includes(term)) {
          best = Math.max(best, FIELD_WEIGHTS[field]);
        }
      }

      if (best === 0) {
        return 0;
      }

      total += best;
    }

    return total;
  }

  /**
   * An empty query returns everything: this backs a board that must show its
   * content by default, unlike the org search dropdown which starts closed.
   *
   * @param {import('../entities/KnowledgeEntry.js').KnowledgeEntry[]} entries
   * @param {string} query
   * @returns {import('../entities/KnowledgeEntry.js').KnowledgeEntry[]}
   */
  static search(entries, query) {
    const terms = KnowledgeSearchService.parseTerms(query);

    if (terms.length === 0) {
      return [...entries];
    }

    return entries
      .map((entry) => ({ entry, score: KnowledgeSearchService.score(entry, terms) }))
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'de'))
      .map((scored) => scored.entry);
  }
}
