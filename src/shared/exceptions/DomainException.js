/**
 * Base Domain Exception
 */

class DomainException extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationException extends DomainException {
  constructor(errors) {
    super('Validation failed', 422);
    this.errors = errors;
  }
}

class NotFoundException extends DomainException {
  constructor(resource) {
    super(`${resource} not found`, 404);
  }
}

class ConflictException extends DomainException {
  constructor(message) {
    super(message, 409);
  }
}

class UnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

module.exports = {
  DomainException,
  ValidationException,
  NotFoundException,
  ConflictException,
  UnauthorizedException
};
