import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Performance monitoring middleware
export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  // Skip monitoring for non-API routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const start = performance.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Log request start
  console.info('Request started:', {
    path: req.path,
    method: req.method,
    requestId,
    timestamp: new Date().toISOString(),
  });

  // Track response time
  res.on('finish', () => {
    const duration = performance.now() - start;
    const status = res.statusCode;

    // Log performance metrics
    console.info('Request completed:', {
      path: req.path,
      method: req.method,
      status,
      duration: `${duration.toFixed(2)}ms`,
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Alert on slow requests (>500ms)
    if (duration > 500) {
      console.warn('Slow request detected:', {
        path: req.path,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  });

  next();
}
