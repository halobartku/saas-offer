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
  // Register API routes before setting up Vite
  registerRoutes(app);
  const server = createServer(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Development vs Production setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server startup
  const PORT = process.env.PORT || 5000;
  server.listen(parseInt(PORT as string), "0.0.0.0", () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    console.log(`${formattedTime} [express] serving on port ${PORT}`);
    console.log('Server startup complete. Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: PORT,
      DATABASE_CONNECTION: process.env.DATABASE_URL ? 'Configured' : 'Missing',
      SESSION_CONFIG: process.env.SESSION_SECRET ? 'Configured' : 'Missing'
    });
  }).on('error', (error) => {
    console.error('Failed to start server:', error);
    console.error('Server startup error details:', {
      error: error.message,
      code: error.code,
      syscall: error.syscall
    });
    process.exit(1);
  });

  // Log environment check
  console.log('Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Missing',
    CLOUDINARY_CONFIG: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing'
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
