/**
 * FuzzyMatcher - Provides fuzzy string matching for employee names
 * Uses Levenshtein distance and various name matching strategies
 */

export class FuzzyMatcher {
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  static levenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[s1.length][s2.length];
  }

  /**
   * Calculate similarity score (0-1) between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (1 = identical, 0 = completely different)
   */
  static similarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const distance = FuzzyMatcher.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Normalize a name for comparison
   * Removes accents, special characters, and normalizes whitespace
   * @param {string} name - Name to normalize
   * @returns {string}
   */
  static normalizeName(name) {
    if (!name) return '';

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Parse a name into parts (handles various formats)
   * @param {string} fullName - Full name string
   * @returns {{firstName: string, lastName: string, parts: string[]}}
   */
  static parseName(fullName) {
    if (!fullName) {
      return { firstName: '', lastName: '', parts: [] };
    }

    const normalized = FuzzyMatcher.normalizeName(fullName);

    // Handle "LastName, FirstName" format
    if (fullName.includes(',')) {
      const [lastName, firstName] = fullName.split(',').map((s) => s.trim());
      return {
        firstName: FuzzyMatcher.normalizeName(firstName || ''),
        lastName: FuzzyMatcher.normalizeName(lastName || ''),
        parts: normalized.split(' ').filter(Boolean),
      };
    }

    // Handle "FirstName LastName" format
    const parts = normalized.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1],
        parts,
      };
    }

    // Single name
    return {
      firstName: '',
      lastName: parts[0] || '',
      parts,
    };
  }

  /**
   * Calculate name match score using multiple strategies
   * @param {string} searchName - Name to search for (e.g., from WIFO)
   * @param {string} candidateName - Candidate name (e.g., from hierarchy)
   * @returns {{score: number, matchType: string}}
   */
  static matchNames(searchName, candidateName) {
    const search = FuzzyMatcher.parseName(searchName);
    const candidate = FuzzyMatcher.parseName(candidateName);

    let bestScore = 0;
    let matchType = 'none';

    // Strategy 1: Exact match (normalized)
    const normalizedSearch = FuzzyMatcher.normalizeName(searchName);
    const normalizedCandidate = FuzzyMatcher.normalizeName(candidateName);

    if (normalizedSearch === normalizedCandidate) {
      return { score: 1.0, matchType: 'exact' };
    }

    // Strategy 2: LastName match (highest weight)
    if (search.lastName && candidate.lastName) {
      const lastNameScore = FuzzyMatcher.similarity(search.lastName, candidate.lastName);
      if (lastNameScore > 0.9) {
        // Strategy 2a: LastName exact + partial FirstName
        if (search.firstName && candidate.firstName) {
          const firstNameScore = FuzzyMatcher.similarity(search.firstName, candidate.firstName);
          const combinedScore = lastNameScore * 0.6 + firstNameScore * 0.4;
          if (combinedScore > bestScore) {
            bestScore = combinedScore;
            matchType = 'name_parts';
          }
        } else {
          // Only LastName match
          if (lastNameScore > bestScore) {
            bestScore = lastNameScore * 0.8; // Penalize partial match
            matchType = 'lastName_only';
          }
        }
      }
    }

    // Strategy 3: Full string fuzzy match
    const fullScore = FuzzyMatcher.similarity(normalizedSearch, normalizedCandidate);
    if (fullScore > bestScore) {
      bestScore = fullScore;
      matchType = 'fuzzy_full';
    }

    // Strategy 4: All parts must be present (order-independent)
    if (search.parts.length > 0 && candidate.parts.length > 0) {
      let matchedParts = 0;

      for (const searchPart of search.parts) {
        for (const candidatePart of candidate.parts) {
          if (FuzzyMatcher.similarity(searchPart, candidatePart) > 0.85) {
            matchedParts++;
            break;
          }
        }
      }

      const partScore = matchedParts / Math.max(search.parts.length, candidate.parts.length);
      if (partScore > bestScore) {
        bestScore = partScore;
        matchType = 'parts_match';
      }
    }

    // Strategy 5: Initials match (for abbreviated names)
    if (search.parts.length > 0 && candidate.parts.length > 0) {
      const searchInitials = search.parts.map((p) => p[0]).join('');
      const candidateInitials = candidate.parts.map((p) => p[0]).join('');

      if (searchInitials === candidateInitials && searchInitials.length >= 2) {
        const initialsScore = 0.7; // Lower confidence for initials match
        if (initialsScore > bestScore) {
          bestScore = initialsScore;
          matchType = 'initials';
        }
      }
    }

    return { score: bestScore, matchType };
  }

  /**
   * Find best matching employee from a list
   * @param {string} searchName - Name to search for
   * @param {Array<{id: string, name: string}>} employees - List of employees
   * @param {number} minScore - Minimum score threshold (default: 0.7)
   * @returns {{employee: Object|null, score: number, matchType: string, isExact: boolean}}
   */
  static findBestMatch(searchName, employees, minScore = 0.7) {
    if (!searchName || !employees || employees.length === 0) {
      return { employee: null, score: 0, matchType: 'none', isExact: false };
    }

    let bestMatch = null;
    let bestScore = 0;
    let bestMatchType = 'none';

    for (const employee of employees) {
      const { score, matchType } = FuzzyMatcher.matchNames(searchName, employee.name);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = employee;
        bestMatchType = matchType;
      }
    }

    if (bestScore >= minScore) {
      return {
        employee: bestMatch,
        score: bestScore,
        matchType: bestMatchType,
        isExact: bestMatchType === 'exact',
      };
    }

    return { employee: null, score: bestScore, matchType: bestMatchType, isExact: false };
  }

  /**
   * Find all matches above threshold
   * @param {string} searchName - Name to search for
   * @param {Array<{id: string, name: string}>} employees - List of employees
   * @param {number} minScore - Minimum score threshold (default: 0.5)
   * @returns {Array<{employee: Object, score: number, matchType: string}>}
   */
  static findAllMatches(searchName, employees, minScore = 0.5) {
    if (!searchName || !employees || employees.length === 0) {
      return [];
    }

    const matches = [];

    for (const employee of employees) {
      const { score, matchType } = FuzzyMatcher.matchNames(searchName, employee.name);

      if (score >= minScore) {
        matches.push({ employee, score, matchType });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }
}
