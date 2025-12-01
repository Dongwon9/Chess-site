import express from 'express';
import { createServer } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSocket } from './ws/server.js';
import lobbyRouter from './routes/lobby.router.js';
import session from 'express-session';
import roomRouter from './routes/room.router.js';
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wsServer = initSocket(server);

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
app.use('/room', roomRouter);

app.get('/', (req, res) => {
  res.redirect('lobby.html');
});
// Server startup
server.listen(PORT);

export default app;
