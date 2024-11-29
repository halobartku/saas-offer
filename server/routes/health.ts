import { Express } from "express";
import { pool } from "../db/pool";
import { createSuccessResponse, createErrorResponse } from "../types/api";

export function registerHealthRoutes(app: Express) {
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    const healthCheck = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: "pending",
        poolSize: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount
      },
      memoryUsage: process.memoryUsage(),
    };

    try {
      // Test database connection
      await pool.query('SELECT 1');
      healthCheck.database.status = "healthy";
      
      res.json(createSuccessResponse(healthCheck, {
        duration: `${Date.now() - startTime}ms`
      }));
    } catch (error) {
      healthCheck.database.status = "unhealthy";
      
      res.status(503).json(createErrorResponse(
        "Service Unavailable",
        "Database connection check failed",
        "HEALTH_CHECK_FAILED",
        {
          ...healthCheck,
          error: error instanceof Error ? error.message : "Unknown error",
          duration: `${Date.now() - startTime}ms`
        }
      ));
    }
  });
}
