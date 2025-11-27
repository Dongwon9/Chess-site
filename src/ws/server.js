import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { setupLobbyHandlers, setupRoomHandlers } from './eventHandlers.js';

class WebSocketServer {
  static instance = null;

  constructor(httpServer) {
    if (WebSocketServer.instance) {
      return WebSocketServer.instance;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupDefaultHandlers();
    this.setupNamespaceHandlers();

    WebSocketServer.instance = this;
    logger.info('WebSocket server initialized');
  }

  setupDefaultHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('User connected', { socketId: socket.id });
      socket.join('lobby');

      socket.on('disconnect', () => {
        logger.info('User disconnected', { socketId: socket.id });
      });

      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  setupNamespaceHandlers() {
    setupLobbyHandlers(this.io);
    setupRoomHandlers(this.io);
  }

  static getInstance(httpServer = null) {
    if (!WebSocketServer.instance && httpServer) {
      new WebSocketServer(httpServer);
    }
    return WebSocketServer.instance;
  }

  getIO() {
    return this.io;
  }
}

export function setupWebSocket(httpServer) {
  return WebSocketServer.getInstance(httpServer);
}

export default function getServer() {
  return WebSocketServer.getInstance().getIO();
}
