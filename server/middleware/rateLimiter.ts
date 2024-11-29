import rateLimit from 'express-rate-limit';
import { createErrorResponse } from '../types/api';
import { validateEnv } from '../types/env';

// Get environment configuration
const env = validateEnv();

// Monitoring and metrics
const rateLimitMetrics = {
  totalRequests: 0,
  limitExceeded: 0,
  lastReset: new Date(),
  endpoints: new Map<string, { hits: number; blocks: number }>()
};

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  endpoint?: string;
}

// Reset metrics periodically
setInterval(() => {
  rateLimitMetrics.totalRequests = 0;
  rateLimitMetrics.limitExceeded = 0;
  rateLimitMetrics.lastReset = new Date();
  rateLimitMetrics.endpoints.clear();
}, 24 * 60 * 60 * 1000); // Reset daily

export const createRateLimiter = ({
  windowMs = env.RATE_LIMIT_WINDOW_MS,
  max = env.RATE_LIMIT_MAX_REQUESTS,
  message = 'Too many requests, please try again later',
  keyGenerator,
  skip,
  endpoint = 'default'
}: RateLimiterOptions = {}) => {
  return rateLimit({
    windowMs,
    max,
    message: JSON.stringify(createErrorResponse(
      'Rate limit exceeded',
      message,
      'RATE_LIMIT_ERROR',
      {
        windowMs,
        maxRequests: max,
        tryAgainIn: `${Math.ceil(windowMs / 1000 / 60)} minutes`,
        retryAfter: new Date(Date.now() + windowMs).toISOString()
      }
    )),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => {
      // Use X-Forwarded-For header if available, otherwise use IP
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : (typeof forwardedFor === 'string' 
          ? forwardedFor.split(',')[0] 
          : req.ip);
      return `${ip}-${req.method}-${req.path}`;
    }),
    skip: skip || ((req) => {
      // Skip rate limiting for health checks and development environment
      const shouldSkip = process.env.NODE_ENV === 'development' || 
                        req.path === '/health' ||
                        req.path === '/metrics';
      
      // Track request even if skipped
      rateLimitMetrics.totalRequests++;
      if (!rateLimitMetrics.endpoints.has(endpoint)) {
        rateLimitMetrics.endpoints.set(endpoint, { hits: 0, blocks: 0 });
      }
      const metrics = rateLimitMetrics.endpoints.get(endpoint)!;
      metrics.hits++;
      
      return shouldSkip;
    }),
    handler: (req, res) => {
      const retryAfter = new Date(Date.now() + windowMs);
      
      // Update metrics
      rateLimitMetrics.limitExceeded++;
      const metrics = rateLimitMetrics.endpoints.get(endpoint);
      if (metrics) {
        metrics.blocks++;
      }
      
      // Log rate limit violation with enhanced context
      console.warn('Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        retryAfter: retryAfter.toISOString(),
        metrics: {
          endpoint,
          totalRequests: rateLimitMetrics.totalRequests,
          limitExceeded: rateLimitMetrics.limitExceeded,
          endpointStats: metrics
        }
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
      
      res.status(429).send(createErrorResponse(
        'Rate limit exceeded',
        message,
        'RATE_LIMIT_ERROR',
        {
          windowMs,
          maxRequests: max,
          tryAgainIn: `${Math.ceil(windowMs / 1000 / 60)} minutes`,
          retryAfter: retryAfter.toISOString()
        }
      ));
    }
  });
};

// Pre-configured rate limiters for different use cases
export const standardLimiter = createRateLimiter();

export const apiLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_API_WINDOW_MS,
  max: env.RATE_LIMIT_API_MAX_REQUESTS
});

export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // 50 requests per 15 minutes
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later'
});

export const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 emails per hour
  message: 'Email sending rate limit exceeded, please try again later'
});
