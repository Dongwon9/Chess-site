import { config } from '../config/env.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

class Logger {
  constructor(level = 'info') {
    this.currentLevel = LOG_LEVELS[level] || LOG_LEVELS.info;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${prefix} ${message}${dataStr}`;
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= this.currentLevel;
  }

  error(message, data) {
    if (this.shouldLog('error')) {
      console.error(
        `${colors.red}${this.formatMessage('error', message, data)}${
          colors.reset
        }`,
      );
    }
  }

  warn(message, data) {
    if (this.shouldLog('warn')) {
      console.warn(
        `${colors.yellow}${this.formatMessage('warn', message, data)}${
          colors.reset
        }`,
      );
    }
  }

  info(message, data) {
    if (this.shouldLog('info')) {
      console.info(
        `${colors.blue}${this.formatMessage('info', message, data)}${
          colors.reset
        }`,
      );
    }
  }

  debug(message, data) {
    if (this.shouldLog('debug')) {
      console.debug(
        `${colors.gray}${this.formatMessage('debug', message, data)}${
          colors.reset
        }`,
      );
    }
  }
}

export const logger = new Logger(config.logLevel);
