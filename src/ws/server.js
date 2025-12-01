import { Server } from 'socket.io';
import { setupLobbyHandlers } from './lobby.handler.js';
let server;
export function getServer(httpServer) {
  if (server) {
    return server;
  }

  server = new Server(httpServer);
  setupLobbyHandlers(server);

  return server;
}
