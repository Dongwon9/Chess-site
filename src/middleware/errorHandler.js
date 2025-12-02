import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
      },
      method: req.method,
      url: req.originalUrl,
    },
    'unhandled error',
  );
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'Internal Server Error' });
}
