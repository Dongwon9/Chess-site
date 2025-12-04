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

  /**
   * 기물 이동
   */
  socket.on('makeMove', ({ move }, callback) => {
    try {
      if (!move) {
        throw new Error('Move information is required');
      }

      const result = room.makeMove(move, nickname);

      if (result.error) {
        if (callback && typeof callback === 'function') {
          callback(result);
        }
        return;
      }

      // Broadcast move to all players in the room
      wss.in(roomId).emit('moveMade', {
        move: result.move,
        fen: result.fen,
        turn: result.turn,
        gameOver: result.gameOver,
        winner: result.winner,
      });

      if (callback && typeof callback === 'function') {
        callback({ success: true, ...result });
      }

      // If game is over, emit gameEnded event
      if (result.gameOver) {
        const endResult = room.endGame(result.winner);
        wss.in(roomId).emit('gameEnded', endResult);

        // Delete room after game ends
        deleteRoom(roomId);
        logger.info({ roomId }, '게임 종료 후 방 삭제');
      }
    } catch (error) {
      logger.error(
        { roomId, nickname, move: payload?.move, error: error.message },
        '이동 처리 중 에러',
      );

      if (callback && typeof callback === 'function') {
        callback({ error: error.message });
      }
    }
  });

  socket.on('disconnect', () => {
    room.leave(nickname);
    logger.info(
      {
        socketId: socket.id,
        roomId,
        nickname,
        remainingPlayers: room.players.length,
      },
      '플레이어 연결 해제',
    );
  });

  socket.on('error', (error) => {
    logger.error(
      { socketId: socket.id, roomId, nickname, error },
      'Socket 에러 발생',
    );
  });
}
