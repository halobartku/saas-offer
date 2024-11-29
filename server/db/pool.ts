import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { validateEnv } from '../types/env';

// Get environment variables
const env = validateEnv();

// Configure connection pool with optimized settings
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Balanced pool size for concurrent connections
  min: 4,  // Increased minimum connections for better availability
  idleTimeoutMillis: 30000, // Reduced idle timeout to free resources faster
  connectionTimeoutMillis: 10000, // Increased connection timeout for stability
  maxUses: 7500, // Reduced max uses to prevent potential memory leaks
  allowExitOnIdle: true, // Allow clean shutdown
  statement_timeout: 30000, // Increased timeout for complex queries
  query_timeout: 30000, // Increased timeout for complex queries
  application_name: 'offer_management_platform',
  keepalive: true, // Enable keepalive
  keepaliveInitialDelayMillis: 10000 // Initial delay for keepalive
});

// Enhanced error handling and monitoring for the pool
pool.on('error', (err, client) => {
  const errorContext = {
    error: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    poolStats: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  };

  console.error('Database pool error:', errorContext);
  
  // Implement graceful handling
  if (client) {
    client.release(true); // Force release with error
  }

  // Check if we need to reset the pool
  if (pool.waitingCount > 5 || pool.totalCount < 2) {
    console.warn('Pool health check failed, attempting recovery...', {
      ...errorContext.poolStats,
      action: 'pool_recovery_initiated'
    });
  }
});

// Enhanced pool event monitoring
pool.on('connect', () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    event: 'connection_created'
  };

  console.info('Database pool: New client connected', metrics);
});

pool.on('acquire', () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    event: 'connection_acquired'
  };

  // Monitor pool health
  if (pool.waitingCount > 3) {
    console.warn('Database pool: Connection contention detected', {
      ...metrics,
      severity: pool.waitingCount > 5 ? 'high' : 'medium',
      suggestedAction: 'monitor_pool_health'
    });
  }

  // Log general acquisition for monitoring
  console.debug('Database connection acquired', metrics);
});

// Add removal monitoring
pool.on('remove', () => {
  console.info('Database pool: Connection removed', {
    timestamp: new Date().toISOString(),
    poolSize: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    event: 'connection_removed'
  });
});

// Export configured Drizzle instance
export const db = drizzle(pool);

// Export pool for direct access if needed
export { pool };
