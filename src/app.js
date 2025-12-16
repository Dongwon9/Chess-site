import express from 'express';
import { initSocket } from './ws/server.js';
import lobbyRouter from './routes/lobby.router.js';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { config, logConfig } from './config/env.js';

// Async initialization function
async function initializeApp() {
  logConfig();
  const app = express();

  // Explicitly disable x-powered-by (helmet also handles this defensively)
  app.disable('x-powered-by');

  // Trust proxy (needed for secure cookies behind load balancers)
  if (config.trustProxy > 0) {
    app.set('trust proxy', config.trustProxy);
  }

  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // Middleware: Static files
  app.use(
    express.static('public', {
      maxAge: config.isProduction ? '1d' : 0,
      etag: true,
    }),
  );

  // Middleware: Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // CORS
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );

  // Middleware: Request logging
  app.use(requestLogger);

  // Basic rate limit
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Routes
  app.use('/lobby', lobbyRouter);

  // Root route redirect
  app.get('/', (req, res) => {
    res.redirect('lobby.html');
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Not found',
    });
  });

  // Error handling middleware (should be last)
  app.use(errorHandler);

  // Server startup
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'HTTP server started');
  });

  // Handle server errors
  server.on('error', (error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Server error');
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} is already in use`);
      process.exit(1);
    }
  });

  // Initialize WebSocket server after HTTP server starts
  try {
    initSocket(server);
    logger.info('WebSocket server initialized');
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      'Failed to initialize WebSocket server',
    );
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error(
      { error: error.message, stack: error.stack },
      'Uncaught exception',
    );
    process.exit(1);
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
  });
}

// Start the application
initializeApp().catch((error) => {
  logger.error(
    { error: error.message, stack: error.stack },
    'Failed to initialize application',
  );
  process.exit(1);
});
