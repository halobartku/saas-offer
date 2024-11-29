import { z } from 'zod';

// Base API Response Interface
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Pagination Interface
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Paginated Response Interface
export interface PaginatedAPIResponse<T = any> extends APIResponse<T> {
  meta: PaginationMeta & {
    timestamp: string;
    requestId?: string;
  };
}

// Error Types
export type ValidationError = {
  path: string;
  message: string;
  code: string;
};

export type ErrorMetadata = {
  timestamp: string;
  requestId?: string;
  path?: string;
  validationErrors?: ValidationError[];
  [key: string]: any;
};

// Base Error Response
export interface APIErrorResponse {
  error: string;
  details?: string;
  code: string;
  meta: ErrorMetadata;
}

// Common Zod Schemas
export const paginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Utility function to create standardized error responses
export function createErrorResponse(
  error: string,
  details?: string,
  code: string = 'UNKNOWN_ERROR',
  additionalMeta: Partial<ErrorMetadata> = {}
): APIErrorResponse {
  return {
    error,
    details,
    code,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      ...additionalMeta
    },
  };
}

// Utility function to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<PaginationMeta>
): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  };
}
