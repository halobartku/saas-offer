import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import session from "express-session";
import passport from "passport";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    console.error('Error:', {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({
      error: err.name || 'Error',
      message: err.message || 'Internal Server Error'
    });
  });

  // Register API routes
  registerRoutes(app);

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
