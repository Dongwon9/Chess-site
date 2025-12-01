import { getServer } from '../ws/server.js';
import { Room } from './room.service.js';
import { v4 } from 'uuid';
const rooms = new Map();

export function createRoom() {
  const newRoom = new Room(v4());
  rooms.set(newRoom.id, newRoom);
  getServer().in('lobby').emit('updateLobby', getJoinableRooms());
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
      rooms.delete(id);
    }
  });
  getServer().in('lobby').emit('updateLobby', getJoinableRooms());
}
