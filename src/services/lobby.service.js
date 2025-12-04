import { getIO } from '../ws/server.js';
import { Room } from './room.service.js';
import { v4 } from 'uuid';
import logger from '../utils/logger.js';

const rooms = new Map();

/**
 * 새로운 방 생성
 * @param {string} roomId - 방 ID (미지정 시 UUID 자동 생성)
 * @returns {Room} 생성된 방
 */
export function createRoom(roomId = null) {
  try {
    const id = roomId || v4();

    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('Invalid room ID');
    }

    // Check if room already exists
    if (rooms.has(id)) {
      logger.warn({ roomId: id }, '이미 존재하는 방입니다');
      return rooms.get(id);
    }

    const newRoom = new Room(id);
    rooms.set(newRoom.id, newRoom);
    logger.info({ roomId: newRoom.id }, '새로운 방 생성');

    // Broadcast updated lobby
    getIO().in('lobby').emit('updateLobby', getJoinableRooms());

    return newRoom;
  } catch (error) {
    logger.error({ error: error.message }, '방 생성 실패');
    throw error;
  }
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
    logger.debug({ roomId, nickname }, '방 참가 성공');
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
        '플레이어가 있는 방을 삭제합니다',
      );
    }
    logger.info({ roomId: id }, '방 삭제');
    rooms.delete(id);
  } else {
    logger.debug({ roomId: id }, '삭제할 방을 찾지 못했습니다');
  }

  // Broadcast updated lobby
  try {
    getIO().in('lobby').emit('updateLobby', getJoinableRooms());
  } catch (error) {
    logger.error({ error: error.message }, '로비 업데이트 실패');
  }
}

/**
 * 모든 방 조회 (테스트/관리용)
 * @returns {Array<{id: string, playerCount: number, isPlaying: boolean}>}
 */
export function getAllRooms() {
  return Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    playerCount: room.players.length,
    isPlaying: room.isPlaying,
  }));
}
