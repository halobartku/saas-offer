import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { ZodError } from 'zod';
import winston from 'winston';

// Setup winston logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log' })
  ]
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Handle API Errors
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code
      }
    });
  }

  // Handle Validation Errors
  if (err instanceof ValidationError || err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.errors
      }
    });
  }

  // Handle all other errors
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: {
        message: 'Internal Server Error'
      }
    });
  }

  // Development error handler - send stack trace
  return res.status(500).json({
    error: {
      message: err.message,
      stack: err.stack
    }
  });
}
