import dotenv from 'dotenv';

dotenv.config();

// Constants
const DEFAULT_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_SESSION_SECRET = 'change-me-in-prod';
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const SESSION_MAX_AGE = 1000 * 60 * 60; // 1 hour
const DEFAULT_TRUST_PROXY = 0;
const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DEFAULT_RATE_LIMIT_MAX = 300; // requests per window per IP
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

// Environment validation
function validateConfig() {
  const errors = [];

  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    errors.push('PORT must be a number');
  }

  const validNodeEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validNodeEnvs.includes(process.env.NODE_ENV)) {
    errors.push(`NODE_ENV must be one of: ${validNodeEnvs.join(', ')}`);
  }

  const validLogLevels = [
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
    'silent',
  ];
  if (
    process.env.LOG_LEVEL &&
    !validLogLevels.includes(process.env.LOG_LEVEL)
  ) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  if (
    process.env.SESSION_SECRET === DEFAULT_SESSION_SECRET &&
    process.env.NODE_ENV === 'production'
  ) {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (
    process.env.TRUST_PROXY &&
    Number.isNaN(Number(process.env.TRUST_PROXY))
  ) {
    errors.push('TRUST_PROXY must be a number (hop count)');
  }

  if (
    process.env.RATE_LIMIT_WINDOW_MS &&
    Number.isNaN(Number(process.env.RATE_LIMIT_WINDOW_MS))
  ) {
    errors.push('RATE_LIMIT_WINDOW_MS must be a number');
  }

  if (
    process.env.RATE_LIMIT_MAX &&
    Number.isNaN(Number(process.env.RATE_LIMIT_MAX))
  ) {
    errors.push('RATE_LIMIT_MAX must be a number');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    errors.push('REDIS_URL must be set in production');
  }

  return errors;
}

const validationErrors = validateConfig();
if (validationErrors.length > 0) {
  console.error('Configuration validation failed:');
  validationErrors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || DEFAULT_NODE_ENV;

export const config = {
  // Server
  port: Number(process.env.PORT || DEFAULT_PORT),

  // Environment
  nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',

  // Logging
  logLevel: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,

  // Session
  sessionSecret: process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET,
  sessionMaxAge: SESSION_MAX_AGE,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sid',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN,

  // Proxy (needed for secure cookies/HTTPS behind load balancer)
  trustProxy: Number(process.env.TRUST_PROXY || DEFAULT_TRUST_PROXY),

  // Rate limiting
  rateLimitWindowMs: Number(
    process.env.RATE_LIMIT_WINDOW_MS || DEFAULT_RATE_LIMIT_WINDOW,
  ),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || DEFAULT_RATE_LIMIT_MAX),

  // Redis (for session store)
  redisUrl: process.env.REDIS_URL || DEFAULT_REDIS_URL,

  // WebSocket
  wsMaxMessageSize: 1024 * 1024, // 1MB
};

/**
 * Log current configuration (safe for logging)
 */
export function logConfig() {
  console.log('Configuration:');
  console.log(`  Node Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Log Level: ${config.logLevel}`);
  console.log(`  CORS Origin: ${config.corsOrigin}`);
}
