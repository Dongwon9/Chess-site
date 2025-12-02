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
  return rooms.get(roomId);
}

export function cleanRoom() {
  rooms.forEach((room, id) => {
    if (room.players.length === 0) {
      logger.info({ roomId: id }, '방 삭제');
      rooms.delete(id);
    }
  });
  getIO().in('lobby').emit('updateLobby', getJoinableRooms());
}
