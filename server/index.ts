import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import session from "express-session";
import passport from "passport";
import MemoryStore from "memorystore";
import morgan from "morgan";

const MemoryStoreSession = MemoryStore(session);

const app = express();

// Request logging middleware
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Request logging middleware
app.use('/api', (req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  next();
});

// Session setup
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "your-secret-key",
  }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

(async () => {
  // Register API routes before setting up Vite
  registerRoutes(app);
  const server = createServer(app);

  // API error handling middleware
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`API Error:`, {
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
    });
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      status: err.status || 500
    });
  });

  // SPA fallback for client-side routing in development
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) {
      res.status(404).json({ message: "API Not Found", status: 404 });
    } else {
      next();
    }
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] Error:`, {
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
    });

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ 
      message,
      status,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  });

  // Development vs Production setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server startup
  const PORT = process.env.PORT || 5000;
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
