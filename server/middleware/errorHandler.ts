import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createErrorResponse } from '../types/api';
import { DatabaseError } from 'pg';

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Log error with context but sanitize sensitive data
  const errorContext = {
    path: req.path,
    method: req.method,
    query: sanitizeObject(req.query),
    headers: sanitizeHeaders(req.headers),
    timestamp: new Date().toISOString(),
    requestId,
    duration: `${Date.now() - startTime}ms`
  };

  // Determine error type and appropriate response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';
  let details = err.message;

  switch (true) {
    case err instanceof ZodError:
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Invalid request data';
      details = formatZodError(err);
      break;

    case err instanceof ValidationError:
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorMessage = 'Validation failed';
      break;

    case err instanceof NotFoundError:
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      errorMessage = 'Resource not found';
      break;

    case err instanceof AuthorizationError:
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      errorMessage = 'Access denied';
      break;

    case err instanceof DatabaseError:
      statusCode = 503;
      errorCode = 'DATABASE_ERROR';
      errorMessage = 'Database operation failed';
      details = sanitizeDatabaseError(err);
      break;

    case err.name === 'TokenExpiredError':
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Authentication token expired';
      break;
  }

  // Log error with full context in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', {
      ...errorContext,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: errorCode
      }
    });
  } else {
    // Production logging with sanitized data
    console.error('Error occurred:', {
      ...errorContext,
      error: {
        name: err.name,
        code: errorCode
      }
    });
  }

  // Send error response
  const response = createErrorResponse(
    errorMessage,
    details,
    errorCode,
    {
      requestId: errorContext.requestId,
      path: errorContext.path,
      timestamp: errorContext.timestamp,
      duration: errorContext.duration
    }
  );

  res.status(statusCode).json(response);
}

// Helper functions
function sanitizeObject(obj: any): any {
  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'token', 'key', 'secret'];
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  return sanitized;
}

function sanitizeDatabaseError(error: DatabaseError): string {
  // Remove potentially sensitive information from database errors
  return error.message.replace(/\b(?:password|user|database|host)\b[:=]?\s*[^\s,)]+/gi, '$1:[REDACTED]');
}

function formatZodError(error: ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}
