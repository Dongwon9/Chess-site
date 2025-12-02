import { Server } from 'socket.io';
import { cleanRoom, createRoom, getJoinableRooms, getRoomById } from '../services/lobby.service.js';
import logger from '../utils/logger.js';
import { setupRoomHandlers } from './room.handler.js';
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, '새 클라이언트 연결');
    const { toRoom, nickname } = socket.handshake.query;

    if (!toRoom) {
      logger.warn({ socketId: socket.id }, '방 정보 없이 연결 시도');
      return;
    }

    socket.join(toRoom);
    logger.debug({ socketId: socket.id, room: toRoom, nickname }, '클라이언트 방 입장');

    if (toRoom === 'lobby') {
      io.in('lobby').emit('updateLobby', getJoinableRooms());
      return;
    }

    let room = getRoomById(toRoom);
    if (!room) {
      room = createRoom(toRoom);
      logger.info({ socketId: socket.id, room: toRoom }, '존재하지 않는 방에 연결 시도, 새로 생성');
    }

    try {
      room.join(nickname);
      io.in(toRoom).emit('updateRoom', room.getRoomInfo());
      logger.info({ socketId: socket.id, room: toRoom, nickname }, '방 입장 성공');
    } catch (error) {
      logger.error({ socketId: socket.id, room: toRoom, error: error.message }, '방 입장 실패');
      socket.emit('error', { message: error.message });
      socket.disconnect();
      return;
    }

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, room: toRoom, nickname }, '클라이언트 연결 해제');
      if (toRoom !== 'lobby' && room) {
        room.leaveRoom(nickname);
        io.in(toRoom).emit('updateRoom', room.getRoomInfo());
        if (room.players.length === 0) {
          logger.debug({ room: toRoom }, '빈 방 정리 예약');
          cleanRoom();
        }
      }
    });

    // 방별 이벤트 핸들러 등록
    if (toRoom !== 'lobby') {
      setupRoomHandlers(socket, io);
    }
  });

  return io;
}

function getIO() {
  if (!io) {
    initSocket();
  }
  return io;
}

export { initSocket, getIO };
