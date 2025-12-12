import { Server } from 'socket.io';
import { getJoinableRooms } from '../services/lobby.service.js';
import logger from '../utils/logger.js';
import { setupRoomHandlers } from './room.handler.js';
import { setupLobbyHandlers } from './lobby.handler.js';
import { registerListener, UPDATE_LOBBY } from '../events/lobby.event.js';
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

  registerListener(UPDATE_LOBBY, () => {
    //로비 참가자들에게 참가 가능한 방 목록 전송
    wss.in(LOCATION_LOBBY).emit('updateLobby', getJoinableRooms());
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

// 로비 핸들러는 별도 모듈로 분리됨
function getIO() {
  if (!wss) {
    throw new Error(
      'WebSocket server is not initialized. Call initSocket first.',
    );
  }
  return wss;
}

export { initSocket, getIO, LOCATION_LOBBY };
