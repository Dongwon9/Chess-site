import { getIO } from '../ws/server.js';
import { Room } from './room.service.js';
import { v4 } from 'uuid';
const rooms = new Map();

export function createRoom() {
  const newRoom = new Room(v4());
  rooms.set(newRoom.id, newRoom);
  console.log(`새로운 방이 생성되었습니다. 방 ID: ${newRoom.id}`);
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
      console.log(`방 ${id}이(가) 삭제되었습니다.`);
      rooms.delete(id);
    }
  });
  getIO().in('lobby').emit('updateLobby', getJoinableRooms());
}
