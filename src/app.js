import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSocket } from './ws/server.js';
import lobbyRouter from './routes/lobby.router.js';
import session from 'express-session';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { config } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware: Static files
app.use(express.static('public'));

// Middleware: Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Request logging
app.use(requestLogger);

// Middleware: Session management
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: config.sessionMaxAge,
      httpOnly: config.isProduction,
      secure: config.isProduction,
      sameSite: 'strict',
    },
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

// Initialize WebSocket server after HTTP server starts
initSocket(server);
logger.info('WebSocket server initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
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

export default app;
