/**
 * Middleware: Global Error Handler
 * Handles all errors in a centralized way
 */

const { DomainException } = require('../../shared/exceptions/DomainException');
const ResponseFormatter = require('../../shared/utils/ResponseFormatter');

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle Domain Exceptions
  if (err instanceof DomainException) {
    return res.status(err.statusCode).json(
      ResponseFormatter.error(err.message, err.errors || [], err.statusCode)
    );
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    const statusCode = getPrismaErrorStatus(err.code);
    return res.status(statusCode).json(
      ResponseFormatter.error(getPrismaErrorMessage(err), [], statusCode)
    );
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json(
      ResponseFormatter.error('Validation failed', err.errors, 422)
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json(
    ResponseFormatter.error(message, [], statusCode)
  );
}

function getPrismaErrorStatus(code) {
  const statusMap = {
    'P2002': 409, // Unique constraint
    'P2025': 404, // Record not found
    'P2003': 400, // Foreign key constraint
    'P2014': 400, // Relation violation
  };
  return statusMap[code] || 500;
}

function getPrismaErrorMessage(err) {
  const messageMap = {
    'P2002': 'Data already exists (duplicate entry)',
    'P2025': 'Record not found',
    'P2003': 'Related record not found',
    'P2014': 'Cannot delete record with related data',
  };
  return messageMap[err.code] || 'Database error occurred';
}

module.exports = errorHandler;
