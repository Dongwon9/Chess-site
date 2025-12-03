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
    setupClientHandlers(socket);
    const { location } = socket.handshake.query;
    if (location === 'lobby') return;
    setupRoomHandlers(socket);
  });
  return wss;
}

function setupClientHandlers(socket) {
  const { location, nickname } = socket.handshake.query;

  if (!location) {
    logger.warn({ socketId: socket.id }, '방 정보 없이 연결 시도');
    return;
  }

  socket.join(location);
  wss.in('lobby').emit('updateLobby', getJoinableRooms());
  logger.debug(
    { socketId: socket.id, rooms: getJoinableRooms() },
    '로비 참가자에게 참가 가능한 방 목록 전송',
  );

  const room = location !== 'lobby' ? getRoomById(location) : null;

  socket.on('disconnect', () => {
    logger.info(
      { socketId: socket.id, room: location, nickname },
      '클라이언트 연결 해제',
    );
    if (location !== 'lobby' && room) {
      room.leaveRoom(nickname);
      wss.in(location).emit('updateRoom', room.getRoomInfo());
      if (room.players.length === 0) {
        logger.debug({ room: location }, '빈 방 정리 예약');
        cleanRoom();
      }
    }
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
