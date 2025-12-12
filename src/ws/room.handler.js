import { getRoomById, joinRoomById } from '../services/lobby.service.js';
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

  // 웹소켓 경로로 입장한 사용자는 초기 준비 상태를 false로 설정
  const player = room.players.find((p) => p.nickname === nickname);
  if (player) {
    player.isReady = false;
  }

  // 초기 접속 시에는 즉시 브로드캐스트하지 않음 (이벤트 기반 업데이트)

  /**
   * 플레이어 준비 상태 변경/설정
   * 이벤트: 'playerReady'
   * payload: { nickname, roomId, isReady? }
   * callback: ({ success, isReady, roomInfo } | { error })
   */
  socket.on('playerReady', (data, callback) => {
    const { nickname: nick, roomId: id, isReady } = data || {};
    const targetRoom = getRoomById(id);
    if (!targetRoom) {
      logger.error({ roomId: id }, '방을 찾을 수 없습니다');
      if (typeof callback === 'function') {
        callback({ error: '방을 찾을 수 없습니다' });
      }
      return;
    }

    const targetPlayer = targetRoom.players.find((p) => p.nickname === nick);
    if (!targetPlayer) {
      logger.error(
        { roomId: id, nickname: nick },
        '플레이어를 찾을 수 없습니다',
      );
      if (typeof callback === 'function') {
        callback({ error: '플레이어를 찾을 수 없습니다' });
      }
      return;
    }

    let newReadyState;
    if (typeof isReady === 'boolean') {
      // 원하는 상태와 현재 상태가 다르면 토글 수행
      if (targetPlayer.isReady !== isReady) {
        newReadyState = targetRoom.togglePlayerReady(nick);
      } else {
        newReadyState = targetPlayer.isReady;
      }
    } else {
      // isReady 미제공 시 토글
      newReadyState = targetRoom.togglePlayerReady(nick);
    }

    const roomInfo = targetRoom.getRoomInfo();
    wss.in(id).emit('updateRoom', roomInfo);
    logger.trace(
      { roomId: id, nickname: nick, isReady: newReadyState },
      '플레이어 준비 상태 처리 완료',
    );
    if (typeof callback === 'function') {
      callback({ success: true, isReady: newReadyState, roomInfo });
    }
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
    logger.trace(
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

  socket.on('resign', (data) => {
    const { roomId, nickname } = data;
    try {
      const room = getRoomById(roomId);
      const gameResult = room.resignGame(nickname);
      wss.in(roomId).emit('updateRoom', { ...room.getRoomInfo(), gameResult });
    } catch (error) {
      logger.error({ error }, '기권 처리중 오류 발생');
    }
  });

  socket.on('callDraw', (data) => {
    const { roomId, nickname } = data;
    try {
      const room = getRoomById(roomId);
      const gameResult = room.callDraw(nickname);
      if (!gameResult) {
        wss.in(roomId).emit('drawCalled');
      }
      wss.in(roomId).emit('updateRoom', { ...room.getRoomInfo(), gameResult });
    } catch (error) {
      logger.error({ error });
    }
  });
}
