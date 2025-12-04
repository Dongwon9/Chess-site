import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../../src/services/room.service.js';

describe('Room Service', () => {
  let room;

  beforeEach(() => {
    room = new Room('test-room-1');
  });

  describe('constructor', () => {
    it('유효한 ID로 방을 생성할 수 있어야 함', () => {
      const newRoom = new Room('valid-id');
      assert.equal(newRoom.id, 'valid-id');
      assert.equal(newRoom.players.length, 0);
      assert.equal(newRoom.isPlaying, false);
    });

    it('유효하지 않은 ID로 생성 시 에러를 던져야 함', () => {
      assert.throws(() => {
        new Room(null);
      }, /Room ID must be a non-empty string/);

      assert.throws(() => {
        new Room('');
      }, /Room ID must be a non-empty string/);

      assert.throws(() => {
        new Room(123);
      }, /Room ID must be a non-empty string/);
    });
  });

  describe('join()', () => {
    it('플레이어가 방에 참가할 수 있어야 함', () => {
      room.join('player1');
      assert.equal(room.players.length, 1);
      assert.equal(room.players[0].nickname, 'player1');
      assert.equal(room.players[0].isReady, false);
    });

    it('두 명의 플레이어가 참가할 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      assert.equal(room.players.length, 2);
    });

    it('같은 닉네임으로 중복 참가 시도 시 무시되어야 함', () => {
      room.join('player1');
      room.join('player1');
      assert.equal(room.players.length, 1);
    });

    it('유효하지 않은 닉네임으로 참가 시도 시 에러를 던져야 함', () => {
      assert.throws(() => {
        room.join();
      }, /Valid nickname is required/);

      assert.throws(() => {
        room.join('');
      }, /Valid nickname is required/);

      assert.throws(() => {
        room.join(null);
      }, /Valid nickname is required/);

      assert.throws(() => {
        room.join(123);
      }, /Valid nickname is required/);
    });

    it('방이 가득 찼을 때 참가 시도 시 에러를 던져야 함', () => {
      room.join('player1');
      room.join('player2');
      assert.throws(() => {
        room.join('player3');
      }, /방이 가득 찼습니다/);
    });

    it('게임 진행 중일 때 참가 시도 시 에러를 던져야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();
      // 플레이어 한 명 제거 후 새 플레이어 입장 시도
      room.leave('player1');

      assert.throws(() => {
        room.join('player3');
      }, /게임이 진행 중입니다/);
    });
  });

  describe('leave()', () => {
    it('플레이어가 방을 떠날 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.leave('player1');
      assert.equal(room.players.length, 1);
      assert.equal(room.players[0].nickname, 'player2');
    });

    it('존재하지 않는 플레이어를 제거해도 에러가 발생하지 않아야 함', () => {
      room.join('player1');
      room.leave('nonexistent');
      assert.equal(room.players.length, 1);
    });

    it('게임 진행 중 플레이어가 나가면 게임이 중단되어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      assert.equal(room.isPlaying, true);
      room.leave('player1');
      assert.equal(room.isPlaying, false);
    });

    it('유효하지 않은 닉네임으로 leave 시도 시 무시되어야 함', () => {
      room.join('player1');
      room.leave(null);
      assert.equal(room.players.length, 1);

      room.leave('');
      assert.equal(room.players.length, 1);
    });
  });

  describe('setPlayerReady()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
    });

    it('플레이어의 준비 상태를 변경할 수 있어야 함', () => {
      room.setPlayerReady('player1', true);
      const player = room.players.find((p) => p.nickname === 'player1');
      assert.equal(player.isReady, true);
    });

    it('준비 상태를 false로 변경할 수 있어야 함', () => {
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player1', false);
      const player = room.players.find((p) => p.nickname === 'player1');
      assert.equal(player.isReady, false);
    });

    it('isReady를 제공하지 않으면 현재 상태를 토글해야 함', () => {
      const player = room.players.find((p) => p.nickname === 'player1');
      assert.equal(player.isReady, false);

      // Toggle to true
      const newState1 = room.setPlayerReady('player1');
      assert.equal(newState1, true);
      assert.equal(player.isReady, true);

      // Toggle to false
      const newState2 = room.setPlayerReady('player1');
      assert.equal(newState2, false);
      assert.equal(player.isReady, false);
    });

    it('setPlayerReady는 새로운 준비 상태를 반환해야 함', () => {
      const result = room.setPlayerReady('player1', true);
      assert.equal(result, true);

      const result2 = room.setPlayerReady('player2', false);
      assert.equal(result2, false);
    });

    it('존재하지 않는 플레이어의 준비 상태 변경 시 에러를 던져야 함', () => {
      assert.throws(() => {
        room.setPlayerReady('nonexistent', true);
      }, /Player not found/);
    });

    it('유효하지 않은 닉네임으로 준비 상태 변경 시 에러를 던져야 함', () => {
      assert.throws(() => {
        room.setPlayerReady(null, true);
      }, /Valid nickname is required/);

      assert.throws(() => {
        room.setPlayerReady('', true);
      }, /Valid nickname is required/);
    });
  });

  describe('canJoin()', () => {
    it('빈 방은 참가 가능해야 함', () => {
      assert.equal(room.canJoin(), true);
    });

    it('한 명만 있는 방은 참가 가능해야 함', () => {
      room.join('player1');
      assert.equal(room.canJoin(), true);
    });

    it('두 명이 있는 방은 참가 불가능해야 함', () => {
      room.join('player1');
      room.join('player2');
      assert.equal(room.canJoin(), false);
    });

    it('게임 진행 중인 방은 참가 불가능해야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();
      assert.equal(room.canJoin(), false);
    });
  });

  describe('startGame()', () => {
    it('두 플레이어가 모두 준비되면 게임을 시작할 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      assert.equal(room.isPlaying, true);
      assert.ok(room.whitePlayer);
      assert.ok(['player1', 'player2'].includes(room.whitePlayer));
    });

    it('게임 시작 후 플레이어의 준비 상태가 초기화되어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      assert.equal(room.players[0].isReady, false);
      assert.equal(room.players[1].isReady, false);
    });

    it('플레이어가 2명이 아니면 에러를 던져야 함', () => {
      room.join('player1');
      room.setPlayerReady('player1', true);

      assert.throws(() => {
        room.startGame();
      }, /need exactly 2 players/);
    });

    it('모든 플레이어가 준비되지 않았으면 에러를 던져야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);

      assert.throws(() => {
        room.startGame();
      }, /all players must be ready/);
    });

    it('게임 시작 후 체스판이 초기 상태여야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      const { gameData } = room.getRoomInfo();
      assert.match(
        gameData.boardFen,
        /rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR/,
      );
    });
  });

  describe('isWhite()', () => {
    it('백 플레이어인지 확인할 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      const whitePlayer = room.whitePlayer;
      assert.equal(room.isWhite(whitePlayer), true);
    });

    it('흑 플레이어는 백이 아니어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      const blackPlayer = room.players.find(
        (p) => p.nickname !== room.whitePlayer,
      ).nickname;
      assert.equal(room.isWhite(blackPlayer), false);
    });

    it('유효하지 않은 닉네임은 백이 아니어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      assert.equal(room.isWhite(null), false);
      assert.equal(room.isWhite(''), false);
      assert.equal(room.isWhite('unknown'), false);
    });
  });

  describe('makeMove()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();
    });

    it('유효한 움직임을 수행할 수 있어야 함', () => {
      const whitePlayer = room.whitePlayer;
      const result = room.makeMove({ from: 'e2', to: 'e4' }, whitePlayer);

      assert.equal(result.error, undefined);
      assert.ok(result.fen);
      assert.equal(result.gameOver, false);
      assert.ok(result.move);
    });

    it('잘못된 움직임은 에러를 반환해야 함', () => {
      const whitePlayer = room.whitePlayer;
      const result = room.makeMove({ from: 'e2', to: 'e5' }, whitePlayer);

      assert.ok(result.error);
    });

    it('상대방 차례에 움직이면 에러를 반환해야 함', () => {
      const whitePlayer = room.whitePlayer;
      const blackPlayer = room.players.find(
        (p) => p.nickname !== whitePlayer,
      ).nickname;

      // 백 플레이어가 흑 기물을 이동하려고 시도
      const result = room.makeMove({ from: 'e7', to: 'e5' }, blackPlayer);

      assert.ok(result.error);
      assert.match(result.error, /당신의 차례가 아닙니다/);
    });

    it('게임이 시작되지 않았으면 에러를 반환해야 함', () => {
      const newRoom = new Room('test-room-2');
      newRoom.join('player1');
      newRoom.join('player2');

      const result = newRoom.makeMove({ from: 'e2', to: 'e4' }, 'player1');
      assert.ok(result.error);
      assert.match(result.error, /시작되지 않았습니다/);
    });

    it('move 정보가 없으면 에러를 반환해야 함', () => {
      const whitePlayer = room.whitePlayer;
      const result = room.makeMove(null, whitePlayer);

      assert.ok(result.error);
    });

    it('닉네임이 없으면 에러를 반환해야 함', () => {
      const result = room.makeMove({ from: 'e2', to: 'e4' }, null);

      assert.ok(result.error);
    });
  });

  describe('endGame()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();
    });

    it('게임 종료 시 정보를 반환해야 함', () => {
      const result = room.endGame('player1');

      assert.ok(result.winner);
      assert.ok(result.reason);
      assert.ok(result.finalFen);
      assert.equal(room.isPlaying, false);
    });

    it('게임이 진행 중이 아니면 null을 반환해야 함', () => {
      const newRoom = new Room('test-room-2');
      const result = newRoom.endGame('player1');

      assert.equal(result, null);
    });
  });

  describe('getRoomInfo()', () => {
    it('방 정보를 올바르게 반환해야 함', () => {
      room.join('player1');
      const { playerData, gameData } = room.getRoomInfo();
      assert.ok(gameData.boardFen);
      assert.equal(playerData.players.length, 1);
      assert.equal(playerData.isPlaying, false);
      assert.equal(playerData.whitePlayer, null);
    });

    it('게임 시작 후 흰색 플레이어 정보를 포함해야 함', () => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();

      const { gameData, playerData } = room.getRoomInfo();
      assert.equal(playerData.isPlaying, true);
      assert.ok(playerData.whitePlayer);
    });
  });

  describe('isMyTurn()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
      room.setPlayerReady('player1', true);
      room.setPlayerReady('player2', true);
      room.startGame();
    });

    it('백 플레이어의 차례를 확인할 수 있어야 함', () => {
      const whitePlayer = room.whitePlayer;
      assert.equal(room.isMyTurn(whitePlayer), true);
    });

    it('흑 플레이어의 처음 차례는 아니어야 함', () => {
      const blackPlayer = room.players.find(
        (p) => p.nickname !== room.whitePlayer,
      ).nickname;
      assert.equal(room.isMyTurn(blackPlayer), false);
    });

    it('유효하지 않은 닉네임은 false를 반환해야 함', () => {
      assert.equal(room.isMyTurn(null), false);
      assert.equal(room.isMyTurn('unknown'), false);
    });
  });
});
