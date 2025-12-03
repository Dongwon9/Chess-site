import { getIO } from '../ws/server.js';
import { Room } from './room.service.js';
import { v4 } from 'uuid';
import logger from '../utils/logger.js';
const rooms = new Map();

export function createRoom(roomId = null) {
  const id = roomId || v4();
  const newRoom = new Room(id);
  rooms.set(newRoom.id, newRoom);
  logger.info({ roomId: newRoom.id }, '새로운 방 생성');
  getIO().in('lobby').emit('updateLobby', getJoinableRooms());
  return newRoom;
}

export function getJoinableRooms() {
  return Array.from(rooms.entries())
    .filter(([_, room]) => room.canJoin())
    .map(([k, v]) => k);
}

export function getRoomById(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    logger.warn({ roomId }, '방을 찾지 못했습니다.');
  }
  return room;
}

export function getRoomInfoById(roomId) {
  const room = getRoomById(roomId);
  if (room) {
    return room.getRoomInfo();
  }
  return null;
}

export function joinRoomById(roomId, nickname) {
  const room = rooms.get(roomId);
  if (room) {
    room.join(nickname);
    return;
  }
  createRoom(roomId).join(nickname);
}

export function deleteRoom(id) {
  const room = rooms.get(id);
  if (room) {
    if (room.players.length !== 0) {
      logger.warn({ roomId: id }, '플레이어가 있는 방 삭제함');
    }
    logger.info({ roomId: id }, '방 삭제');
    rooms.delete(id);
  } else {
    logger.warn({ roomId: id }, '삭제할 방을 찾지 못했습니다.');
  }

  getIO().in('lobby').emit('updateLobby', getJoinableRooms());
}
