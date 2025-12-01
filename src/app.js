import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServer } from './ws/server.js';
import lobbyRouter from './routes/lobby.router.js';
import session from 'express-session';

const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wsServer = getServer(server);

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.use('/lobby', lobbyRouter);

app.get('/', (req, res) => {
  res.redirect('lobby.html');
});
// Server startup
server.listen(PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
