import winston from 'winston';
import expressWinston from 'express-winston';
import { Request, Response } from 'express';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger instance with environment-specific configuration
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'offer-management' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''}`;
        })
      ),
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ 
        filename: '/tmp/logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
        format: logFormat
      }),
      new winston.transports.File({ 
        filename: '/tmp/logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
        format: logFormat
      })
    ] : [])
  ],
  // Prevent logger from exiting on uncaught errors
  exitOnError: false
});

// Request logging middleware with enhanced metadata
export const requestLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  requestWhitelist: [...expressWinston.requestWhitelist, 'body'],
  responseWhitelist: [...expressWinston.responseWhitelist, 'body'],
  dynamicMeta: (req: Request, res: Response) => ({
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    correlationId: req.get('x-correlation-id') || req.id,
    responseTime: res.get('x-response-time'),
  }),
  ignoreRoute: (req: Request) => {
    // Don't log health checks or static assets
    return req.url.startsWith('/health') || req.url.startsWith('/static');
  }
});

// Error logging middleware
export const errorLogger = expressWinston.errorLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: '/tmp/logs/error.log',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  format: logFormat
});

export const logError = (error: Error, context?: string) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info({
    message,
    meta,
    timestamp: new Date().toISOString()
  });
};
