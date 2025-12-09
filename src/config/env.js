import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

// Constants
const DEFAULT_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_SESSION_SECRET = 'asdsad';
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';
const SESSION_MAX_AGE = 1000 * 60 * 60; // 1 hour

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

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN,

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
