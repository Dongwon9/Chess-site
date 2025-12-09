import {
  getRoomById,
  joinRoomById,
  deleteRoom,
} from '../services/lobby.service.js';
import logger from '../utils/logger.js';

/**
 * 방 WebSocket 핸들러 설정
 * @param {Socket} socket - Socket.io 소켓
 * @param {Server} wss - Socket.io 서버
 */
export function setupRoomHandlers(socket, wss) {
  const { nickname, location: roomId } = socket.handshake.query;

  if (!nickname || !roomId) {
    logger.warn({ socketId: socket.id }, '필수 정보 없이 방 연결 시도');
    socket.disconnect();
    return;
  }

  try {
    joinRoomById(roomId, nickname);
    logger.info({ socketId: socket.id, roomId, nickname }, '방에 참가했습니다');
  } catch (error) {
    logger.error(
      { socketId: socket.id, roomId, nickname, error: error.message },
      '방 참가 실패',
    );
    socket.emit('error', { message: error.message });
    socket.disconnect();
    return;
  }

  const room = getRoomById(roomId);
  if (!room) {
    logger.error({ roomId }, '방을 찾을 수 없습니다');
    socket.disconnect();
    return;
  }

  // 방에 참여한 직후 현재 방 상태를 해당 방 모든 클라이언트에게 전송
  wss.in(roomId).emit('updateRoom', room.getRoomInfo());

  /**
   * 플레이어 준비 상태 변경
   */
  socket.on('togglePlayerReady', (data) => {
    const { nickname, roomId } = data;
    const room = getRoomById(roomId);
    if (!room) {
      logger.error({ roomId }, '방을 찾을 수 없습니다');
      return;
    }

    const isReady = room.togglePlayerReady(nickname);
    wss.in(roomId).emit('updateRoom', room.getRoomInfo());
    logger.info({ roomId, nickname, isReady }, '플레이어 준비 상태 변경 완료');
  });

  socket.on('disconnect', () => {
    room.leave(nickname);
    let gameResult;
    if (room.isPlaying) {
      gameResult = room.finishGame();
    }
    logger.info(
      {
        socketId: socket.id,
        roomId,
        nickname,
        remainingPlayers: room.players.length,
      },
      '플레이어 연결 해제',
    );
    wss.in(roomId).emit('updateRoom', { ...room.getRoomInfo(), gameResult });
  });

  socket.on('error', (error) => {
    logger.error(
      { socketId: socket.id, roomId, nickname, error },
      'Socket 에러 발생',
    );
  });

  socket.on('makeMove', (data, callback) => {
    logger.info(
      { socketId: socket.id, data, callback },
      'makeMove 이벤트 수신',
    );
    const { roomId, source, target } = data;
    const room = getRoomById(roomId);
    const valid = room.makeMove({ source, target });
    if (valid) {
      let payload = {};
      if (room.board.isGameOver()) {
        const gameResult = room.finishGame();
        payload = { ...room.getRoomInfo(), gameResult };
      } else {
        payload = room.getRoomInfo();
      }
      wss.in(roomId).emit('updateRoom', payload);
      logger.debug({ roomId, source, target }, '유효한 이동 처리 완료');
      callback(true);
    } else {
      logger.warn({ roomId, source, target }, '유효하지 않은 이동 시도');
      callback(false);
    }
  });
}
