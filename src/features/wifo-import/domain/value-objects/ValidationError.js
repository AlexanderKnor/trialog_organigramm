/**
 * Value Object: ValidationError
 * Represents a validation error for a WIFO import record
 */

export const VALIDATION_ERROR_SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

export const VALIDATION_ERROR_CODE = Object.freeze({
  MISSING_REQUIRED_FIELD: 'missingRequiredField',
  INVALID_DATE_FORMAT: 'invalidDateFormat',
  INVALID_NUMBER_FORMAT: 'invalidNumberFormat',
  UNKNOWN_AGENT: 'unknownAgent',
  UNKNOWN_CATEGORY: 'unknownCategory',
  DUPLICATE_ENTRY: 'duplicateEntry',
  NEGATIVE_AMOUNT: 'negativeAmount',
  FUTURE_DATE: 'futureDate',
  INVALID_PROVISION_TYPE: 'invalidProvisionType',
  AMOUNT_MISMATCH: 'amountMismatch',
  UNKNOWN_PROVIDER: 'unknownProvider',
  FUZZY_MATCH: 'fuzzyMatch',
  POTENTIAL_DUPLICATE: 'potentialDuplicate',
});

export const VALIDATION_ERROR_MESSAGES = Object.freeze({
  [VALIDATION_ERROR_CODE.MISSING_REQUIRED_FIELD]: 'Pflichtfeld fehlt',
  [VALIDATION_ERROR_CODE.INVALID_DATE_FORMAT]: 'Ungültiges Datumsformat',
  [VALIDATION_ERROR_CODE.INVALID_NUMBER_FORMAT]: 'Ungültiges Zahlenformat',
  [VALIDATION_ERROR_CODE.UNKNOWN_AGENT]: 'Vermittler nicht gefunden',
  [VALIDATION_ERROR_CODE.UNKNOWN_CATEGORY]: 'Unbekannte Kategorie/Sparte',
  [VALIDATION_ERROR_CODE.DUPLICATE_ENTRY]: 'Eintrag bereits vorhanden',
  [VALIDATION_ERROR_CODE.NEGATIVE_AMOUNT]: 'Storno (negativer Betrag)',
  [VALIDATION_ERROR_CODE.FUTURE_DATE]: 'Datum liegt in der Zukunft',
  [VALIDATION_ERROR_CODE.INVALID_PROVISION_TYPE]: 'Ungültige Provisionsart',
  [VALIDATION_ERROR_CODE.AMOUNT_MISMATCH]: 'Beträge stimmen nicht überein',
  [VALIDATION_ERROR_CODE.UNKNOWN_PROVIDER]: 'Anbieter nicht gefunden',
  [VALIDATION_ERROR_CODE.FUZZY_MATCH]: 'Mitarbeiter durch Ähnlichkeitsabgleich gefunden',
  [VALIDATION_ERROR_CODE.POTENTIAL_DUPLICATE]: 'Mögliches Duplikat erkannt',
});

export class ValidationError {
  #code;
  #message;
  #field;
  #severity;
  #details;

  constructor({ code, message = null, field = null, severity = VALIDATION_ERROR_SEVERITY.ERROR, details = null }) {
    if (!Object.values(VALIDATION_ERROR_CODE).includes(code)) {
      throw new Error(`Invalid validation error code: ${code}`);
    }

    this.#code = code;
    this.#message = message || VALIDATION_ERROR_MESSAGES[code];
    this.#field = field;
    this.#severity = severity;
    this.#details = details;
  }

  get code() {
    return this.#code;
  }

  get message() {
    return this.#message;
  }

  get field() {
    return this.#field;
  }

  get severity() {
    return this.#severity;
  }

  get details() {
    return this.#details;
  }

  get isError() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.ERROR;
  }

  get isWarning() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.WARNING;
  }

  get isInfo() {
    return this.#severity === VALIDATION_ERROR_SEVERITY.INFO;
  }

  get fullMessage() {
    let msg = this.#message;
    if (this.#field) {
      msg = `${this.#field}: ${msg}`;
    }
    if (this.#details) {
      const formattedDetails = this.#formatDetails();
      if (formattedDetails) {
        msg = `${msg} (${formattedDetails})`;
      }
    }
    return msg;
  }

  /**
   * Formats details based on error code for human-readable display
   */
  #formatDetails() {
    if (!this.#details) {
      return '';
    }

    // String details can be used directly
    if (typeof this.#details === 'string') {
      return this.#details;
    }

    // Number details (e.g., amounts)
    if (typeof this.#details === 'number') {
      return this.#details.toString();
    }

    // Object details - format based on error code
    if (typeof this.#details === 'object') {
      return this.#formatObjectDetails();
    }

    return String(this.#details);
  }

  /**
   * Formats object details based on the error code context
   */
  #formatObjectDetails() {
    const details = this.#details;

    // Duplicate entry details
    if (this.#code === VALIDATION_ERROR_CODE.DUPLICATE_ENTRY ||
        this.#code === VALIDATION_ERROR_CODE.POTENTIAL_DUPLICATE) {
      return this.#formatDuplicateDetails(details);
    }

    // Fuzzy match details
    if (this.#code === VALIDATION_ERROR_CODE.FUZZY_MATCH) {
      return this.#formatFuzzyMatchDetails(details);
    }

    // Unknown agent with suggestions
    if (this.#code === VALIDATION_ERROR_CODE.UNKNOWN_AGENT && details.suggestions) {
      return this.#formatAgentSuggestions(details);
    }

    // Generic object - try to extract meaningful info
    if (details.name) {
      return details.name;
    }
    if (details.message) {
      return details.message;
    }

    // Fallback: list key-value pairs
    return Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') || 'Details vorhanden';
  }

  /**
   * Formats duplicate entry details
   */
  #formatDuplicateDetails(details) {
    // Internal duplicates (within the same file) - message already contains line number
    if (details.duplicateType === 'internal') {
      // No additional details needed, message already says "Duplikat in dieser Datei (Zeile X)"
      return '';
    }

    const parts = [];

    // Existing entry info (external duplicates from database)
    if (details.existingEntry) {
      const entry = details.existingEntry;
      if (entry.customerName) {
        parts.push(entry.customerName);
      }
      if (entry.contractNumber) {
        parts.push(`Vertrag: ${entry.contractNumber}`);
      }
      if (entry.entryDate) {
        const date = entry.entryDate instanceof Date
          ? entry.entryDate
          : new Date(entry.entryDate);
        if (!isNaN(date.getTime())) {
          parts.push(date.toLocaleDateString('de-DE'));
        }
      }
      if (entry.provisionAmount !== undefined) {
        const formatted = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(entry.provisionAmount);
        parts.push(formatted);
      }
    }

    // Confidence level (only show if not 100%)
    if (details.confidence !== undefined && details.confidence < 1) {
      const percent = Math.round(details.confidence * 100);
      parts.push(`${percent}% Übereinstimmung`);
    }

    return parts.length > 0 ? parts.join(', ') : '';
  }

  /**
   * Formats fuzzy match details
   */
  #formatFuzzyMatchDetails(details) {
    const parts = [];

    if (details.searchedName) {
      parts.push(`Gesucht: "${details.searchedName}"`);
    }
    if (details.matchedName) {
      parts.push(`Gefunden: "${details.matchedName}"`);
    }
    if (details.score !== undefined) {
      const percent = Math.round(details.score * 100);
      parts.push(`${percent}% Ähnlichkeit`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Ähnlicher Eintrag';
  }

  /**
   * Formats unknown agent suggestions
   */
  #formatAgentSuggestions(details) {
    const searchedName = details.searchedName || details.name;
    if (searchedName) {
      const suggestions = details.suggestions || [];
      if (suggestions.length > 0) {
        const suggestionNames = suggestions
          .slice(0, 3)
          .map((s) => {
            if (typeof s === 'string') return s;
            const name = s.name || s.employeeName;
            const score = s.score !== undefined ? ` (${Math.round(s.score * 100)}%)` : '';
            return name ? `${name}${score}` : null;
          })
          .filter(Boolean);
        if (suggestionNames.length > 0) {
          return `"${searchedName}" → Vorschläge: ${suggestionNames.join(', ')}`;
        }
      }
      return `"${searchedName}"`;
    }
    return 'Unbekannt';
  }

  equals(other) {
    if (!(other instanceof ValidationError)) {
      return false;
    }
    return (
      this.#code === other.code &&
      this.#field === other.field &&
      this.#severity === other.severity
    );
  }

  toJSON() {
    return {
      code: this.#code,
      message: this.#message,
      field: this.#field,
      severity: this.#severity,
      details: this.#details,
    };
  }

  static fromJSON(json) {
    return new ValidationError({
      code: json.code,
      message: json.message,
      field: json.field,
      severity: json.severity,
      details: json.details,
    });
  }

  static missingRequiredField(field) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.MISSING_REQUIRED_FIELD,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
    });
  }

  static invalidDateFormat(field, details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.INVALID_DATE_FORMAT,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details,
    });
  }

  static invalidNumberFormat(field, details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.INVALID_NUMBER_FORMAT,
      field,
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details,
    });
  }

  static unknownAgent(agentName) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.UNKNOWN_AGENT,
      field: 'AP-VM',
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details: agentName,
    });
  }

  static unknownCategory(category) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.UNKNOWN_CATEGORY,
      field: 'Sparte',
      severity: VALIDATION_ERROR_SEVERITY.ERROR,
      details: category,
    });
  }

  static duplicateEntry(details = null) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.DUPLICATE_ENTRY,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
      details,
    });
  }

  static negativeAmount(field, amount) {
    const formattedAmount = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

    return new ValidationError({
      code: VALIDATION_ERROR_CODE.NEGATIVE_AMOUNT,
      message: `Storno: wird mit Status "Storniert" importiert`,
      field,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
      details: formattedAmount,
    });
  }

  static futureDate(field) {
    return new ValidationError({
      code: VALIDATION_ERROR_CODE.FUTURE_DATE,
      field,
      severity: VALIDATION_ERROR_SEVERITY.WARNING,
    });
  }
}
