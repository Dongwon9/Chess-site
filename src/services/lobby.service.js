import { getServer } from '../ws/server.js';
import { Room } from './room.service.js';

const rooms = new Map();

export function createRoom(roomId) {
  if (rooms.has(roomId)) {
    throw new Error(`Room already exists: ${roomId}`);
  }
  const newRoom = new Room(roomId);
  rooms.set(roomId, newRoom);
  getServer().in('lobby').emit('updateLobby', getJoinableRooms());
  return newRoom;
}

export function getJoinableRooms() {
  return Array.from(rooms.entries())
    .filter(([_, room]) => room.canJoin())
    .map(([k]) => k);
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
