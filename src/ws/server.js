import { Server } from 'socket.io';
import { getJoinableRooms } from '../services/lobby.service.js';
import logger from '../utils/logger.js';
import { setupRoomHandlers } from './room.handler.js';

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const CORS_METHODS = ['GET', 'POST'];
const LOCATION_LOBBY = 'lobby';

let wss;

function initSocket(server) {
  wss = new Server(server, {
    cors: {
      origin: CORS_ORIGIN,
      methods: CORS_METHODS,
    },
  });

  wss.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, '새 클라이언트 연결');
    const { location } = socket.handshake.query;

    if (!location) {
      logger.warn({ socketId: socket.id }, '방 정보 없이 연결 시도');
      socket.disconnect();
      return;
    }

    socket.join(location);

    if (location === LOCATION_LOBBY) {
      setupLobbyHandlers(socket);
    } else {
      setupRoomHandlers(socket, wss);
    }
  });

  return wss;
}

function setupLobbyHandlers(socket) {
  // Send joinable rooms to the connecting client
  socket.emit('updateLobby', getJoinableRooms());
  logger.debug(
    { socketId: socket.id, rooms: getJoinableRooms() },
    '로비 참가자에게 참가 가능한 방 목록 전송',
  );
}
function getIO() {
  if (!wss) {
    throw new Error(
      'WebSocket server is not initialized. Call initSocket first.',
    );
  }
  return wss;
}

export { initSocket, getIO, LOCATION_LOBBY };
