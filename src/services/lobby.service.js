import getServer from '../ws/server';
import { Room } from './room.service.js';
export class LobbyService {
  constructor() {
    this.rooms = [];
  }

  createRoom(roomId) {
    const newRoom = new Room(roomId);
    this.rooms.push(newRoom);
    getServer().emit(
      'updateRooms',
      this.rooms.map((room) => room.id),
    );
  }

  joinRoom(roomId, nickname) {
    const room = this.rooms.find((room) => room.id === roomId);
    if (room) {
      room.add({ nickname, ready: false, color: null });
    }
  }

  leaveRoom(roomId, nickname) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const user of room) {
      if (user.nickname === nickname) {
        room.delete(user);
        break;
      }
    }
    if (room.size === 0) {
      this.deleteRoom(roomId);
    }
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }
  getRooms() {
    return this.rooms;
  }
}
