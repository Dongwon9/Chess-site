import { Room } from './room.service.js';
import logger from '../utils/logger.js';

const rooms = new Map();

// Lazy import to avoid circular dependency
async function getIO() {
  const module = await import('../ws/server.js');
  return module.getIO();
}

/**
 * 새로운 방 생성
 * @param {string} roomId - 방 ID (미지정 시 UUID 자동 생성)
 * @returns {Room} 생성된 방
 */
export function createRoom(roomId = null) {
  const newRoom = new Room(roomId);
  rooms.set(newRoom.id, newRoom);
  logger.info({ roomId: newRoom.id }, '새로운 방 생성');
  // Broadcast updated lobby - use sync version for internal reference
  notifyLobbyUpdate();

  return newRoom;
}

/**
 * Notify lobby clients of room list update
 */
export function notifyLobbyUpdate() {
  import('../ws/server.js').then((module) => {
    try {
      module.getIO().in('lobby').emit('updateLobby', getJoinableRooms());
    } catch (error) {
      logger.debug({ error: error.message }, 'Failed to notify lobby update');
    }
  });
}

/**
 * 참여 가능한 방 목록 조회
 * @returns {Array<string>} 방 ID 배열
 */
export function getJoinableRooms() {
  return Array.from(rooms.entries())
    .filter(([_, room]) => {
      try {
        return room.canJoin();
      } catch (error) {
        logger.warn({ roomId: _, error: error.message }, '방 상태 확인 실패');
        return false;
      }
    })
    .map(([k]) => k);
}

/**
 * 방 ID로 방 조회
 * @param {string} roomId - 방 ID
 * @returns {Room|null} 방 객체 또는 null
 */
export function getRoomById(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    logger.warn({ roomId }, '유효하지 않은 방 ID');
    return null;
  }

  const room = rooms.get(roomId);
  if (!room) {
    logger.debug({ roomId }, '방을 찾지 못했습니다');
    return null;
  }

  return room;
}

/**
 * 방 정보 조회
 * @param {string} roomId - 방 ID
 * @returns {Object|null} 방 정보 또는 null
 */
export function getRoomInfoById(roomId) {
  const room = getRoomById(roomId);
  if (room) {
    try {
      return room.getRoomInfo();
    } catch (error) {
      logger.error({ roomId, error: error.message }, '방 정보 조회 실패');
      return null;
    }
  }
  return null;
}

/**
 * 방에 플레이어 입장
 * @param {string} roomId - 방 ID
 * @param {string} nickname - 플레이어 닉네임
 */
export function joinRoomById(roomId, nickname) {
  if (!roomId || typeof roomId !== 'string') {
    throw new Error('Valid room ID is required');
  }

  if (!nickname || typeof nickname !== 'string') {
    throw new Error('Valid nickname is required');
  }

  try {
    let room = rooms.get(roomId);

    if (!room) {
      room = createRoom(roomId);
    }

    room.join(nickname);
  } catch (error) {
    logger.error({ roomId, nickname, error: error.message }, '방 참가 실패');
    throw error;
  }
}

/**
 * 방 삭제
 * @param {string} id - 방 ID
 */
export function deleteRoom(id) {
  if (!id || typeof id !== 'string') {
    logger.warn({ roomId: id }, '유효하지 않은 방 ID');
    return;
  }

  const room = rooms.get(id);
  if (room) {
    if (room.players.length !== 0) {
      logger.warn(
        { roomId: id, playerCount: room.players.length },
        '플레이어가 아직 있는 방을 삭제합니다',
      );
    }
    logger.info({ roomId: id }, '방 삭제');
    rooms.delete(id);
  } else {
    logger.debug({ roomId: id }, '삭제할 방을 찾지 못했습니다');
  }

  // Broadcast updated lobby
  notifyLobbyUpdate();
}

/**
 * 모든 방 조회 (테스트/관리용)
 * @returns {Array<{id: string, playerCount: number, isPlaying: boolean}>}
 */
export function getAllRooms() {
  return Array.from(rooms.keys());
}
