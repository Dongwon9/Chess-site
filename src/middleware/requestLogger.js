import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs HTTP method, URL, status code, and response time
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Capture the original res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    logger.debug(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      },
      'HTTP request',
    );

    // Call the original end method
    originalEnd.apply(res, args);
  };

  next();
}
