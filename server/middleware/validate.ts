import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { APIError } from './errorHandler';

// Middleware to validate requests using Zod schemas
export const validateRequest = (
  schema: AnyZodObject
) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          message: 'Validation Error',
          details: error.errors
        }
      });
    }
    return next(error);
  }
};

// Authentication middleware
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session || !req.session.userId) {
    throw new APIError(401, 'Unauthorized');
  }
  next();
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userRole) {
      throw new APIError(401, 'Unauthorized');
    }
    
    if (!allowedRoles.includes(req.session.userRole)) {
      throw new APIError(403, 'Forbidden - Insufficient permissions');
    }
    
    next();
  };
};
