import { logger } from '../utils/logger.js';

export function setupLobbyHandlers(io) {
  const lobby = io.of('/lobby');

  lobby.on('connection', (socket) => {
    logger.debug('Lobby connection', { socketId: socket.id });

    socket.on('join_lobby', (data) => {
      logger.info('Player joined lobby', { socketId: socket.id, ...data });
      lobby.emit('player_joined', { socketId: socket.id, ...data });
    });

    socket.on('leave_lobby', () => {
      logger.info('Player left lobby', { socketId: socket.id });
      lobby.emit('player_left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      logger.info('Lobby disconnect', { socketId: socket.id });
      lobby.emit('player_left', { socketId: socket.id });
    });
  });
}

export function setupRoomHandlers(io) {
  const room = io.of('/room');

  room.on('connection', (socket) => {
    logger.debug('Room connection', { socketId: socket.id });

    socket.on('join_room', (roomId, data) => {
      logger.info('Player joined room', {
        socketId: socket.id,
        roomId,
        ...data,
      });
      socket.join(roomId);
      room.to(roomId).emit('player_joined', { socketId: socket.id, ...data });
    });

    socket.on('move', (roomId, move) => {
      logger.debug('Move received', { socketId: socket.id, roomId, move });
      room.to(roomId).emit('move', { socketId: socket.id, move });
    });

    socket.on('leave_room', (roomId) => {
      logger.info('Player left room', { socketId: socket.id, roomId });
      socket.leave(roomId);
      room.to(roomId).emit('player_left', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      logger.info('Room disconnect', { socketId: socket.id });
    });
  });
}
