import { Server } from 'socket.io';
import {
  createRoom,
  getJoinableRooms,
  getRoomById,
} from '../services/lobby.service.js';
import logger from '../utils/logger.js';
import { setupRoomHandlers } from './room.handler.js';
let wss;

function initSocket(server) {
  wss = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  wss.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, '새 클라이언트 연결');
    const { location } = socket.handshake.query;
    socket.join(location);
    setupClientHandlers(socket);
    if (location !== 'lobby') {
      setupRoomHandlers(socket, wss);
    }
  });
  return wss;
}

function setupClientHandlers(socket) {
  const { location, nickname } = socket.handshake.query;

  if (!location) {
    logger.warn({ socketId: socket.id }, '방 정보 없이 연결 시도');
    return;
  }

  wss.in('lobby').emit('updateLobby', getJoinableRooms());
  logger.debug(
    { socketId: socket.id, rooms: getJoinableRooms() },
    '로비 참가자에게 참가 가능한 방 목록 전송',
  );

  const room = location !== 'lobby' ? getRoomById(location) : null;

  socket.on('disconnect', () => {
    logger.info(
      { socketId: socket.id, location, nickname },
      '클라이언트 연결 해제',
    );
    if (location === 'lobby' || !room) {
      return;
    }
    room.leave(nickname);
  });

  socket.onAny((event, ...args) => {
    logger.debug(
      { socketId: socket.id, event, args },
      '클라이언트가 이벤트 수신',
    );
  });
}

function getIO() {
  if (!wss) {
    initSocket();
  }
  return wss;
}

export { initSocket, getIO };
