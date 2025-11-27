import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupWebSocket } from './ws/server.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import apiRoutes from './routes/index.js';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wsServer = setupWebSocket(server);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(
  session({
    secret: 'asdsad',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }),
);
// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.redirect('lobby.html');
});

app.get('/get-nickname', (req, res) => {
  res.json({ nickname: req.session.nickname || null });
});

app.post('/set-nickname', (req, res) => {
  const { nickname } = req.body;
  req.session.nickname = nickname;
  res.json({ success: true });
});
// Error handling
app.use(errorHandler);

// Server startup
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`, {
    env: config.nodeEnv,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
