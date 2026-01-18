/**
 * Exception: WIFOImportError
 * Base error class for WIFO import errors
 */

import { DomainError } from '../../../../core/errors/DomainError.js';

export class WIFOImportError extends DomainError {
  constructor(message, code = 'WIFO_IMPORT_ERROR') {
    super(message, code);
    this.name = 'WIFOImportError';
  }
}

export class WIFOParseError extends WIFOImportError {
  constructor(message, details = null) {
    super(message, 'WIFO_PARSE_ERROR');
    this.name = 'WIFOParseError';
    this.details = details;
  }
}

export class WIFOValidationError extends WIFOImportError {
  constructor(message, errors = []) {
    super(message, 'WIFO_VALIDATION_ERROR');
    this.name = 'WIFOValidationError';
    this.errors = errors;
  }
}

export class WIFOFileFormatError extends WIFOImportError {
  constructor(message, expectedFormat = null) {
    super(message, 'WIFO_FILE_FORMAT_ERROR');
    this.name = 'WIFOFileFormatError';
    this.expectedFormat = expectedFormat;
  }
}

export class WIFOMappingError extends WIFOImportError {
  constructor(message, field = null, value = null) {
    super(message, 'WIFO_MAPPING_ERROR');
    this.name = 'WIFOMappingError';
    this.field = field;
    this.value = value;
  }
}
