import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { APIErrorResponse, createErrorResponse } from '../types/api';

// Extended request interface to include validation metadata
declare global {
  namespace Express {
    interface Request {
      validatedAt?: string;
      schemaVersion?: string;
      validatedData?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export function validateRequest(schema: ZodSchema, options: {
  stripUnknown?: boolean;
  strict?: boolean;
} = { stripUnknown: true, strict: true }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Create validation context with request metadata
      const context = {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || crypto.randomUUID()
      };

      // Validate request data
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }, {
        strict: options.strict,
        stripUnknown: options.stripUnknown,
      });
      
      // Update request with validated data and cleanup
      if (validated.body) {
        req.body = validated.body;
      }
      if (validated.query) {
        req.query = validated.query;
      }
      if (validated.params) {
        req.params = validated.params;
      }
      
      // Add minimal validation metadata
      req.validatedAt = context.timestamp;
      req.schemaVersion = schema.version ?? '1.0.0';
      
      // Store only necessary validated data
      req.validatedData = {
        ...(validated.body && { body: validated.body }),
        ...(validated.query && { query: validated.query }),
        ...(validated.params && { params: validated.params })
      };

      // Log successful validation
      if (process.env.NODE_ENV === 'development') {
        console.debug('Request validation successful:', {
          ...context,
          schemaVersion: req.schemaVersion,
        });
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Transform validation errors into a more structured format
        const validationErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          expected: err.expected,
          received: err.received,
        }));

        // Create detailed error response
        const response: APIErrorResponse = createErrorResponse(
          'Validation Error',
          'Request validation failed',
          'VALIDATION_ERROR',
          {
            validationErrors,
            context: {
              path: req.path,
              method: req.method,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          }
        );
        
        // Log validation error with context
        console.error('Validation error:', {
          path: req.path,
          method: req.method,
          errors: validationErrors,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          headers: Object.keys(req.headers)
        });
        
        res.status(400).json(response);
      } else {
        // Handle unexpected errors
        console.error('Unexpected validation error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
        next(error);
      }
    }
  };
}

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorContext = {
    path: req.path,
    method: req.method,
    query: req.query,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || crypto.randomUUID()
  };

  // Determine error type and appropriate status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';

  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Invalid request data';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    errorMessage = 'Access denied';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    errorMessage = 'Resource not found';
  }

  // Log error with context
  console.error('Error occurred:', {
    ...errorContext,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: errorCode
    }
  });

  // Send error response
  const response = createErrorResponse(
    errorMessage,
    err.message,
    errorCode,
    {
      requestId: errorContext.requestId,
      path: errorContext.path,
      timestamp: errorContext.timestamp
    }
  );

  res.status(statusCode).json(response);
}
