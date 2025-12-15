import pino from 'pino';
import { config } from '../config/env.js';

const logger = pino({
  // Ensure no logs during tests
  level: config.isTest ? 'silent' : config.logLevel,
  transport:
    config.isDevelopment && !config.isTest
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export default logger;
