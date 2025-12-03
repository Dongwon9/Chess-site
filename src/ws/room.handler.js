import { getRoomById, joinRoomById } from '../services/lobby.service.js';
import logger from '../utils/logger.js';

export function setupClientRoomHandlers(socket) {
  const { location, nickname } = socket.handshake.query;
  joinRoomById(location, nickname);

  const room = getRoomById(location);
}

export function setupRoomHandlers(socket) {
  const { nickname, location } = socket.handshake.query;
  joinRoomById(location, nickname);

  socket.on('playerReady', ({ nickname, roomId }, callback) => {
    const room = getRoomById(roomId);
    if (!room) {
      return;
    }
    room.setPlayerReady(nickname);
    logger.info({ roomId, nickname }, '플레이어 준비 상태 변경');
    callback(room.getRoomInfo());
  });
}
