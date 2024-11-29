import express, { type Request, Response, NextFunction } from "express";
import { logger, requestLogger, errorLogger, logError } from "./utils/logger";
import { performanceMonitor } from "./middleware/performance";

// Process error handling
process.on('uncaughtException', (error: Error) => {
  logError(error, 'Uncaught Exception');
  // Allow logs to be written before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logError(new Error(String(reason)), 'Unhandled Rejection');
  // Allow logs to be written before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import session from "express-session";
import passport from "passport";
import MemoryStore from "memorystore";
import { validateEnv } from "./types/env";
import helmet from "helmet";
import hpp from 'hpp';
import { rateLimit } from 'express-rate-limit';
import { validationResult } from 'express-validator';

// Validate environment variables before starting the application
let env;
try {
  env = validateEnv();
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Fatal Error: Environment Configuration Failed');
  console.error('\x1b[33m%s\x1b[0m', error instanceof Error ? error.message : 'Unknown error');
  
  // Log additional context in development
  if (process.env.NODE_ENV !== 'production') {
    console.debug('Current Environment Context:', {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error type'
    });
  }
  
  // Exit with error
  process.exit(1);
}

const MemoryStoreSession = MemoryStore(session);

const app = express();

// Global input validation error handler
const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation Error',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// HTTP Parameter Pollution protection
app.use(hpp());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Trust proxy setup for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Enhanced rate limiters with more granular control
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_API_WINDOW_MS,
  max: env.RATE_LIMIT_API_MAX_REQUESTS,
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Additional security measures
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request size limits and parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Error handling for JSON parsing
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON',
      code: 'INVALID_JSON'
    });
  }
  next(err);
});

// Session setup with enhanced security and memory management
app.use(
  session({
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStoreSession({
      checkPeriod: 1800000, // prune expired entries every 30 minutes
      max: 2000, // maximum number of sessions
      ttl: 43200000, // session TTL (12 hours)
      dispose: function(key, val) {
        // Cleanup any resources when session is destroyed
        if (val?.destroy) val.destroy();
        // Log session destruction for audit
        logger.info('Session destroyed', { sessionId: key });
      },
      stale: false, // Don't serve stale sessions
      noDisposeOnSet: true, // Don't dispose on session update
    }),
    name: 'sessionId', // Change default connect.sid
    resave: false,
    saveUninitialized: false,
    secret: env.SESSION_SECRET,
    rolling: true, // Refresh session with each request
  }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

(async () => {
  // Performance monitoring
  app.use(performanceMonitor);
  
  // Use winston request logger
  app.use(requestLogger);

  // Global error logger
  app.use(errorLogger);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    
    // Log error with context
    logError(err, 'Global Error Handler');
    
    // Send appropriate error response
    const status = err.status || err.statusCode || 500;
    const errorResponse = {
      error: err.name || 'Error',
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
    
    res.status(status).json(errorResponse);
  });

  try {
    // Register API routes
    registerRoutes(app);
    
    // Start background jobs after routes are registered
    const { BackgroundJobService } = await import("./services/backgroundJobs");
    await BackgroundJobService.startJobs();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }

  // Catch-all middleware for non-API routes
  app.use('/api/*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ error: "API endpoint not found" });
  });

  const server = createServer(app);

  // Development vs Production setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server startup
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    console.log(`${formattedTime} [express] serving on port ${PORT}`);
  });
})();

// For TypeScript type safety with Express session
declare module "express-session" {
  interface SessionData {
    passport: {
      user?: any;
    };
  }
}
