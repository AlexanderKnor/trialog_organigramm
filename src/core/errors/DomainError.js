/**
 * Base Domain Error Class
 */

export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
    };
  }
}

export class ValidationError extends DomainError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType, id) {
    super(`${entityType} with id '${id}' not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
    this.entityType = entityType;
    this.entityId = id;
  }
}

export class DuplicateError extends DomainError {
  constructor(entityType, identifier) {
    super(`${entityType} with identifier '${identifier}' already exists`, 'DUPLICATE');
    this.name = 'DuplicateError';
    this.entityType = entityType;
    this.identifier = identifier;
  }
}

export class HierarchyError extends DomainError {
  constructor(message) {
    super(message, 'HIERARCHY_ERROR');
    this.name = 'HierarchyError';
  }
}

export class StorageError extends DomainError {
  constructor(message) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}
