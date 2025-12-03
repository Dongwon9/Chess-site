import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  next();
}
