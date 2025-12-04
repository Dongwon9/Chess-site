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

const PORT = config.port;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'asdsad',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }),
);

app.use('/lobby', lobbyRouter);

app.get('/', (req, res) => {
  res.redirect('lobby.html');
});
// Server startup
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'server started');
});

// Initialize WebSocket server after HTTP server starts
initSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
