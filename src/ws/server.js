import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { setupRoomHandlers } from './room.handler.js';
import { setupLobbyHandlers } from './lobby.handler.js';
let server;
export function getServer(httpServer) {
  if (server) {
    return server;
  }

  server = new Server(httpServer);
  setupRoomHandlers(server);
  setupLobbyHandlers(server);
  logger.info('WebSocket server setup complete');

  return server;
}
