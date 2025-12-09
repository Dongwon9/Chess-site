import { describe, it, expect } from '@jest/globals';
import {
  createRoom,
  getRoomById,
  getJoinableRooms,
  deleteRoom,
} from '../../src/services/lobby.service.js';
import { config } from '../../src/config/env.js';
config.logLevel = 'silent';
describe('Lobby Service', () => {
  describe('createRoom()', () => {
    it('새로운 방을 생성할 수 있어야 함', () => {
      const room = createRoom('test-room-1');

      expect(room).toBeDefined();
      expect(room.id).toBe('test-room-1');
      expect(room.players.length).toBe(0);
      expect(room.isPlaying).toBe(false);
    });

    it('커스텀 ID로 방을 생성할 수 있어야 함', () => {
      const customId = 'custom-room-id-' + Date.now();
      const room = createRoom(customId);

      expect(room.id).toBe(customId);
    });

    it('ID 없이 호출하면 UUID를 생성해야 함', () => {
      const room = createRoom();

      expect(room.id).toBeDefined();
      expect(typeof room.id).toBe('string');
      expect(room.id.length).toBeGreaterThan(0);
    });
  });

  describe('getRoomById()', () => {
    it('존재하는 방을 ID로 가져올 수 있어야 함', () => {
      const room = createRoom('test-room-get-' + Date.now());
      const retrieved = getRoomById(room.id);

      expect(retrieved).toBe(room);
      expect(retrieved.id).toBe(room.id);
    });

    it('존재하지 않는 방 ID는 null을 반환해야 함', () => {
      const room = getRoomById('nonexistent-room-xyz-' + Date.now());

      expect(room).toBeNull();
    });
  });

  describe('getJoinableRooms()', () => {
    it('참가 가능한 방을 반환해야 함', () => {
      const room1 = createRoom('joinable-room-1-' + Date.now());

      const joinableRooms = getJoinableRooms();

      expect(Array.isArray(joinableRooms)).toBe(true);
      expect(joinableRooms).toContain(room1.id);
    });

    it('가득 찬 방은 목록에 포함되지 않아야 함', () => {
      const room = createRoom('full-room-test-' + Date.now());
      room.join('player1');
      room.join('player2');

      const joinableRooms = getJoinableRooms();

      expect(joinableRooms).not.toContain(room.id);
    });
  });

  describe('deleteRoom()', () => {
    it('존재하는 방을 삭제할 수 있어야 함', () => {
      const room = createRoom('room-to-delete-' + Date.now());

      deleteRoom(room.id);
      const retrieved = getRoomById(room.id);

      expect(retrieved).toBeNull();
    });

    it('존재하지 않는 방을 삭제하려고 해도 에러가 발생하지 않아야 함', () => {
      expect(() => {
        deleteRoom('nonexistent-room-to-delete-' + Date.now());
      }).not.toThrow();
    });
  });
});
