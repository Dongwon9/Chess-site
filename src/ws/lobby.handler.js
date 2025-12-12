import { getJoinableRooms } from '../services/lobby.service.js';
import logger from '../utils/logger.js';

/**
 * 로비 WebSocket 핸들러 설정
 * 연결된 클라이언트에게 현재 참가 가능한 방 목록을 전송
 */
export function setupLobbyHandlers(socket) {
  socket.emit('updateLobby', getJoinableRooms());
  logger.debug(
    { socketId: socket.id, rooms: getJoinableRooms() },
    '로비 참가자에게 참가 가능한 방 목록 전송',
  );
}
