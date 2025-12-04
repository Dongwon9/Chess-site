import { getRoomById, joinRoomById } from '../services/lobby.service.js';
import logger from '../utils/logger.js';

export function setupClientRoomHandlers(socket) {
  const { location, nickname } = socket.handshake.query;
  joinRoomById(location, nickname);

  const room = getRoomById(location);
}

export function setupRoomHandlers(socket, wss) {
  const { nickname, location } = socket.handshake.query;
  joinRoomById(location, nickname);

  // 방에 참여한 직후 현재 방 상태를 해당 방 모든 클라이언트에게 전송
  const joinedRoom = getRoomById(location);
  if (joinedRoom) {
    wss.in(location).emit('updateRoom', joinedRoom.getRoomInfo());
  }

  socket.on('playerReady', ({ nickname, roomId, isReady }, callback) => {
    try {
      const room = getRoomById(roomId);
      if (!room) {
        logger.warn({ roomId, nickname }, '방을 찾을 수 없음');
        if (callback) callback({ error: 'Room not found' });
        return;
      }

      const newReadyState = room.setPlayerReady(nickname, isReady);
      const roomInfo = room.getRoomInfo();

      // Send updated room info to all clients in the room
      wss.in(roomId).emit('updateRoom', roomInfo);

      // Send acknowledgement to the requesting client
      if (callback) {
        callback({ success: true, isReady: newReadyState, roomInfo });
      }

      logger.info(
        { roomId, nickname, isReady: newReadyState },
        '플레이어 준비 상태 변경 완료',
      );
      wss.in(roomId).emit('updateRoom', room.getRoomInfo());
    } catch (error) {
      logger.error(
        { roomId, nickname, error: error.message },
        '준비 상태 변경 실패',
      );
      if (callback) {
        callback({ error: error.message });
      }
    }
  });

  wss.on('playerReady', () => {
    logger.info('서버가 playerReady 받음');
  });
}
