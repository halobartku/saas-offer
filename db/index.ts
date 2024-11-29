import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { validateEnv } from "../server/types/env";
import { sql } from "drizzle-orm";

// Connection pool configuration with optimized settings
const POOL_CONFIG = {
  connectionTimeoutMillis: 15000, // 15 seconds - increased for reliability
  idleTimeoutMillis: 300000, // 5 minutes - increased to reduce connection churn
  max: 20, // Reduced max connections to prevent connection exhaustion
  min: 2,  // Minimum pool size optimized for startup
  statementTimeoutMillis: 30000, // 30 seconds - reduced to fail faster
  retryInterval: 2000, // 2 seconds - increased to reduce load during issues
  maxRetries: 3, // Reduced retries for faster failure detection
  connectionHealingMillis: 180000, // 3 minutes - more frequent health checks
  keepAlive: true, // Enable keepalive
  keepAliveInitialDelay: 60000, // 1 minute initial delay
  maxUses: 7500, // Maximum number of uses before a connection is retired
  allowExitOnIdle: true // Allow clean shutdown
};

// Enhanced health check query with performance metrics
const HEALTH_CHECK_QUERY = sql`
  SELECT 
    current_timestamp as check_time,
    current_database() as database_name,
    pg_backend_pid() as backend_pid,
    pg_is_in_recovery() as is_replica,
    version() as pg_version,
    (SELECT count(*) FROM pg_stat_activity) as active_connections
`;

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private db: any;
  private isShuttingDown: boolean = false;
  private lastHealthCheck: Date = new Date();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeHealthCheck();
  }

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  private initializeHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.performHealthCheck();
      }
    }, POOL_CONFIG.connectionHealingMillis);
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    let checkStatus = 'unknown';
    
    try {
      const result = await this.db.execute(HEALTH_CHECK_QUERY);
      const duration = Date.now() - startTime;
      const metrics = result.rows[0];
      
      // Analyze connection pool health
      const connectionUtilization = (metrics.active_connections / POOL_CONFIG.max) * 100;
      checkStatus = 'healthy';

      // Log detailed health metrics
      console.debug('Database health check:', {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        status: checkStatus,
        metrics: {
          ...metrics,
          connectionUtilization: `${connectionUtilization.toFixed(2)}%`,
          poolConfig: {
            maxConnections: POOL_CONFIG.max,
            currentConnections: metrics.active_connections
          },
          performance: {
            queryDuration: duration,
            isPerformant: duration < 1000 // Flag slow health checks
          }
        }
      });

      // Alert on high connection utilization
      if (connectionUtilization > 80) {
        console.warn('High database connection utilization:', {
          timestamp: new Date().toISOString(),
          utilization: `${connectionUtilization.toFixed(2)}%`,
          availableConnections: POOL_CONFIG.max - metrics.active_connections
        });
      }

      this.lastHealthCheck = new Date();
    } catch (error) {
      checkStatus = 'failed';
      const failureDuration = Date.now() - startTime;
      
      console.error('Database health check failed:', {
        timestamp: new Date().toISOString(),
        status: checkStatus,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        metrics: {
          failureDuration: `${failureDuration}ms`,
          timeSinceLastSuccess: this.lastHealthCheck 
            ? `${Date.now() - this.lastHealthCheck.getTime()}ms`
            : 'never',
          consecutiveFailures: this.consecutiveFailures
        }
      });

      // Attempt recovery with progressive backoff
      await this.handleConnectionFailure(error);
    }
  }

  private async handleConnectionFailure(error: any): Promise<void> {
    if (this.isShuttingDown) return;

    console.error('Database connection failure:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Unknown error',
      lastHealthCheck: this.lastHealthCheck.toISOString()
    });

    await this.reconnect();
  }

  private async reconnect(attempt: number = 1): Promise<void> {
    if (attempt > POOL_CONFIG.maxRetries || this.isShuttingDown) {
      console.error('Max reconnection attempts reached:', {
        attempts: attempt,
        maxRetries: POOL_CONFIG.maxRetries,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    }

    try {
      console.log(`Attempting database reconnection (${attempt}/${POOL_CONFIG.maxRetries})...`);
      await this.initialize();
      console.log('Database reconnection successful');
    } catch (error) {
      const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(`Reconnection attempt ${attempt} failed, retrying in ${backoff}ms`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      await this.reconnect(attempt + 1);
    }
  }

  async initialize(): Promise<any> {
    try {
      const env = validateEnv();
      const initStartTime = Date.now();

      // Create connection with timeout
      const connectionPromise = new Promise(async (resolve, reject) => {
        try {
          const db = drizzle({
            connection: env.DATABASE_URL,
            schema,
            options: POOL_CONFIG
          });

          // Verify connection with timeout
          const connectionTimeout = setTimeout(() => {
            reject(new Error('Database connection verification timed out'));
          }, POOL_CONFIG.connectionTimeoutMillis);

          try {
            await db.execute(HEALTH_CHECK_QUERY);
            clearTimeout(connectionTimeout);
            resolve(db);
          } catch (error) {
            clearTimeout(connectionTimeout);
            reject(error);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.db = await connectionPromise;

      const initDuration = Date.now() - initStartTime;
      console.log('Database initialized successfully:', {
        timestamp: new Date().toISOString(),
        initializationDuration: `${initDuration}ms`,
        poolConfig: {
          maxConnections: POOL_CONFIG.max,
          minConnections: POOL_CONFIG.min,
          idleTimeout: `${POOL_CONFIG.idleTimeoutMillis}ms`,
          connectionTimeout: `${POOL_CONFIG.connectionTimeoutMillis}ms`
        }
      });

      return this.db;
    } catch (error) {
      const errorDetails = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : 'Unknown error',
        connectionConfig: {
          timeoutMs: POOL_CONFIG.connectionTimeoutMillis,
          retryInterval: POOL_CONFIG.retryInterval,
          maxRetries: POOL_CONFIG.maxRetries
        }
      };

      console.error('Database initialization failed:', errorDetails);

      // Throw enhanced error with context
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('Gracefully shutting down database connections:', {
      timestamp: new Date().toISOString(),
      lastHealthCheck: this.lastHealthCheck.toISOString()
    });

    // Allow pending queries to complete (with timeout)
    await Promise.race([
      new Promise(resolve => setTimeout(resolve, 5000)),
      this.db.execute(sql`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid()`)
    ]);
  }
}

// Initialize database connection
const dbManager = DatabaseConnectionManager.getInstance();
export const db = await dbManager.initialize();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal');
  await dbManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal');
  await dbManager.shutdown();
  process.exit(0);
});
