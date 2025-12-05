import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Lobby Service', () => {
  let createRoom, getRoomById, getJoinableRooms, deleteRoom;

  beforeEach(async () => {
    const module = await import('../../src/services/lobby.service.js');
    createRoom = module.createRoom;
    getRoomById = module.getRoomById;
    getJoinableRooms = module.getJoinableRooms;
    deleteRoom = module.deleteRoom;
  });

  describe('createRoom()', () => {
    it('새로운 방을 생성할 수 있어야 함', async () => {
      const room = createRoom();

      assert.ok(room);
      assert.ok(room.id);
      assert.equal(room.players.length, 0);
      assert.equal(room.isPlaying, false);
    });

    it('커스텀 ID로 방을 생성할 수 있어야 함', async () => {
      const customId = 'custom-room-id';
      const room = createRoom(customId);

      assert.equal(room.id, customId);
    });

    it('ID 없이 호출하면 UUID를 생성해야 함', async () => {
      const room = createRoom();

      assert.ok(room.id);
      assert.match(
        room.id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('이미 존재하는 ID로 방을 생성할 수 없어야 함', async () => {
      const room1 = createRoom('duplicate-room-id');
      const room2 = createRoom('duplicate-room-id');

      assert.equal(rooms.length, 1);
    });

    it('2개 이상의 방을 생성할 수 있어야 함', async () => {
      const room1 = createRoom('room-1');
      const room2 = createRoom('room-2');

      assert.notEqual(room1.id, room2.id);
      assert.equal(rooms.length, 2);
    });
  });

  describe('getRoomById()', () => {
    it('존재하는 방을 ID로 가져올 수 있어야 함', async () => {
      const room = createRoom('test-room-get-1');
      const retrieved = getRoomById('test-room-get-1');

      assert.equal(retrieved, room);
      assert.equal(retrieved.id, 'test-room-get-1');
    });

    it('존재하지 않는 방 ID는 undefined를 반환해야 함', async () => {
      const room = getRoomById('nonexistent-room-xyz');

      assert.equal(room, undefined);
    });
  });

  describe('getJoinableRooms()', () => {
    it('참가 가능한 방 목록을 반환해야 함', async () => {
      const room1 = createRoom('joinable-room-1');
      const room2 = createRoom('joinable-room-2');

      const joinableRooms = getJoinableRooms();

      assert.ok(Array.isArray(joinableRooms));
      assert.ok(joinableRooms.includes('joinable-room-1'));
      assert.ok(joinableRooms.includes('joinable-room-2'));
    });

    it('가득 찬 방은 목록에 포함되지 않아야 함', async () => {
      const room = createRoom('full-room-test');
      room.join('player1');
      room.join('player2');

      const joinableRooms = getJoinableRooms();

      assert.equal(joinableRooms.includes('full-room-test'), false);
    });

    it('게임 진행 중인 방은 목록에 포함되지 않아야 함', async () => {
      const room = createRoom('playing-room-test');
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      const joinableRooms = getJoinableRooms();

      assert.equal(joinableRooms.includes('playing-room-test'), false);
    });
  });

  describe('deleteRoom()', () => {
    it('존재하는 방을 삭제할 수 있어야 함', async () => {
      const room = createRoom('room-to-delete');

      deleteRoom('room-to-delete');
      const retrieved = getRoomById('room-to-delete');

      assert.equal(retrieved, undefined);
    });
    it('존재하지 않는 방을 삭제하려고 해도 에러가 발생하지 않아야 함', async () => {
      assert.doesNotThrow(() => {
        deleteRoom('nonexistent-room-to-delete');
      });
    });
    it('플레이어가 있는 방을 삭제할 때 경고 로그가 기록되어야 함', async () => {
      const loggerModule = await import('../../src/utils/logger.js');
      const logger = loggerModule.default;

      // 로그를 가로채기 위한 스파이 함수 생성
      let warningLogged = false;
      const originalWarn = logger.warn;
      logger.warn = (msg) => {
        warningLogged = true;
        originalWarn.call(logger, msg);
      };

      const room = createRoom('room-with-players');
      room.join('player1');

      deleteRoom('room-with-players');

      // 원래의 warn 메서드 복원
      logger.warn = originalWarn;

      assert.equal(warningLogged, true);
    });
  });
});
