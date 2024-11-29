import { z } from 'zod';

/**
 * Environment Variable Schema
 * Defines and validates all required and optional environment variables
 */
export const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string()
    .min(1, "Database URL is required")
    .regex(/^postgres(ql)?:\/\/.*$/, "Invalid PostgreSQL connection string format")
    .describe("PostgreSQL connection string (required)"),
  
  // Security Configuration
  SESSION_SECRET: z.string()
    .min(32, "Session secret must be at least 32 characters long")
    .regex(/^[a-zA-Z0-9_\-]+$/, "Session secret must contain only alphanumeric characters, underscores, and hyphens")
    .describe("Secret key for session management (required, min 32 chars)"),
  
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: z.string()
    .min(1, "Cloudinary cloud name is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid Cloudinary cloud name format")
    .describe("Cloudinary cloud name (required)"),
  CLOUDINARY_API_KEY: z.string()
    .min(1, "Cloudinary API key is required")
    .regex(/^[0-9]+$/, "Cloudinary API key must contain only numbers")
    .describe("Cloudinary API key (required)"),
  CLOUDINARY_API_SECRET: z.string()
    .min(1, "Cloudinary API secret is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Cloudinary API secret must contain only alphanumeric characters, underscores, and hyphens")
    .describe("Cloudinary API secret (required)"),
  
  // Email Configuration
  SMTP_USER: z.string()
    .email("Invalid SMTP user email format")
    .describe("SMTP user email address (required)"),
  SMTP_PASS: z.string()
    .min(1, "SMTP password is required")
    .describe("SMTP password (required)"),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.coerce.number()
    .int("Window must be an integer")
    .min(1000, "Window must be at least 1 second")
    .default(15 * 60 * 1000)
    .describe("Rate limit window in milliseconds (default: 15 minutes)"),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number()
    .int("Max requests must be an integer")
    .min(1, "Max requests must be at least 1")
    .default(100)
    .describe("Maximum requests per window (default: 100)"),
  RATE_LIMIT_API_WINDOW_MS: z.coerce.number()
    .int("API window must be an integer")
    .min(1000, "API window must be at least 1 second")
    .default(60 * 1000)
    .describe("API rate limit window in milliseconds (default: 1 minute)"),
  RATE_LIMIT_API_MAX_REQUESTS: z.coerce.number()
    .int("API max requests must be an integer")
    .min(1, "API max requests must be at least 1")
    .default(30)
    .describe("Maximum API requests per window (default: 30)"),
  
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development')
    .describe("Node environment (default: development)"),
  
  // Optional Configuration
  PORT: z.coerce.number()
    .int("Port must be an integer")
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be less than 65536")
    .default(5000)
    .describe("Application port (default: 5000)"),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug'])
    .default('info')
    .describe("Logging level (default: info)"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and provides detailed error messages
 * @returns Validated environment variables
 * @throws Error with detailed message if validation fails
 */
export function validateEnv(): Env {
  try {
    // Parse environment variables with coercion
    const env = envSchema.parse(process.env);

    // Log validation success in non-production environments
    if (env.NODE_ENV !== 'production') {
      console.log('Environment variables validated successfully:', {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        logLevel: env.LOG_LEVEL,
        timestamp: new Date().toISOString()
      });
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Separate issues by type for better error reporting
      const issues = error.issues.reduce((acc, issue) => {
        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
          acc.missing.push(issue.path.join('.'));
        } else {
          acc.invalid.push({
            variable: issue.path.join('.'),
            message: issue.message,
            received: issue.received
          });
        }
        return acc;
      }, { missing: [] as string[], invalid: [] as any[] });

      // Build detailed error message
      let errorMessage = 'Environment Configuration Error:\n\n';

      if (issues.missing.length > 0) {
        errorMessage += 'Missing Required Variables:\n' +
          issues.missing.map(v => `- ${v}`).join('\n') + '\n\n';
      }

      if (issues.invalid.length > 0) {
        errorMessage += 'Invalid Variables:\n' +
          issues.invalid.map(v => 
            `- ${v.variable}: ${v.message} (received: ${v.received})`
          ).join('\n') + '\n\n';
      }

      errorMessage += 'Please check your environment configuration and try again.\n' +
        'Refer to the documentation for proper environment variable setup.';

      throw new Error(errorMessage);
    }

    // Handle unexpected errors
    throw new Error(
      `Unexpected error during environment validation: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}
