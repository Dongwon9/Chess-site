import { describe, it, beforeEach, expect } from '@jest/globals';
import { gameEndReason, Room } from '../../src/services/room.service.js';
import { config } from '../../src/config/env.js';
config.logLevel = 'silent';
describe('Room Service', () => {
  let room;

  beforeEach(() => {
    room = new Room('test-room-1');
  });

  describe('constructor', () => {
    it('유효한 ID로 방을 생성할 수 있어야 함', () => {
      const newRoom = new Room('valid-id');
      expect(newRoom.id).toBe('valid-id');
      expect(newRoom.players.length).toBe(0);
      expect(newRoom.isPlaying).toBe(false);
    });

    it('ID 없이 생성하면 UUID를 생성해야 함', () => {
      const newRoom = new Room();
      expect(newRoom.id).toBeDefined();
      expect(typeof newRoom.id).toBe('string');
    });
  });

  describe('join()', () => {
    it('플레이어가 방에 참가할 수 있어야 함', () => {
      room.join('player1');
      expect(room.players.length).toBe(1);
      expect(room.players[0].nickname).toBe('player1');
      expect(room.players[0].isReady).toBe(true);
    });

    it('두 명의 플레이어가 참가할 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      expect(room.players.length).toBe(2);
    });

    it('같은 닉네임으로 중복 참가 시도 시 무시되어야 함', () => {
      room.join('player1');
      room.join('player1');
      expect(room.players.length).toBe(1);
    });

    it('유효하지 않은 닉네임으로 참가 시도 시 에러를 던져야 함', () => {
      expect(() => {
        room.join();
      }).toThrow(/Valid nickname is required/);

      expect(() => {
        room.join('');
      }).toThrow(/Valid nickname is required/);

      expect(() => {
        room.join(null);
      }).toThrow(/Valid nickname is required/);

      expect(() => {
        room.join(123);
      }).toThrow(/Valid nickname is required/);
    });

    it('방이 가득 찼을 때 참가 시도 시 에러를 던져야 함', () => {
      room.join('player1');
      room.join('player2');
      expect(() => {
        room.join('player3');
      }).toThrow(/방이 가득 찼습니다/);
    });

    it('게임 진행 중일 때 참가 시도 시 에러를 던져야 함', () => {
      room.join('player1');
      room.join('player2');
      room.startGame();

      expect(() => {
        room.join('player3');
      }).toThrow(/게임이 진행 중입니다/);
    });
  });

  describe('leave()', () => {
    it('플레이어가 방을 떠날 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.leave('player1');
      expect(room.players.length).toBe(1);
      expect(room.players[0].nickname).toBe('player2');
    });

    it('존재하지 않는 플레이어를 제거해도 에러가 발생하지 않아야 함', () => {
      room.join('player1');
      room.leave('nonexistent');
      expect(room.players.length).toBe(1);
    });

    it('플레이어가 모두 나가면 방이 삭제되어야 함', () => {
      room.join('player1');
      room.leave('player1');
      // 방이 삭제되므로 플레이어 수는 0이 됨
      expect(room.players.length).toBe(0);
    });
  });

  describe('togglePlayerReady()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
    });

    it('플레이어의 준비 상태를 토글할 수 있어야 함', () => {
      const initialState = room.players[0].isReady;
      const newState = room.togglePlayerReady('player1');
      expect(newState).toBe(!initialState);
      expect(room.players[0].isReady).toBe(!initialState);
    });

    it('존재하지 않는 플레이어의 준비 상태 변경 시 에러를 던져야 함', () => {
      expect(() => {
        room.togglePlayerReady('nonexistent');
      }).toThrow(/Player not found/);
    });
  });

  describe('canJoin()', () => {
    it('빈 방은 참가 가능해야 함', () => {
      expect(room.canJoin()).toBe(true);
    });

    it('한 명만 있는 방은 참가 가능해야 함', () => {
      room.join('player1');
      expect(room.canJoin()).toBe(true);
    });

    it('두 명이 있는 방은 참가 불가능해야 함', () => {
      room.join('player1');
      room.join('player2');
      expect(room.canJoin()).toBe(false);
    });

    it('게임 진행 중인 방은 참가 불가능해야 함', () => {
      room.join('player1');
      room.join('player2');
      room.startGame();
      expect(room.canJoin()).toBe(false);
    });
  });

  describe('startGame()', () => {
    it('두 플레이어가 모두 준비되면 게임을 시작할 수 있어야 함', () => {
      room.join('player1');
      room.join('player2');
      room.startGame();

      expect(room.isPlaying).toBe(true);
      expect(room.board).toBeDefined();
    });

    it('플레이어가 2명이 아니면 에러를 던져야 함', () => {
      room.join('player1');

      expect(() => {
        room.startGame();
      }).toThrow();
    });

    it('게임 시작 후 체스판이 초기 상태여야 함', () => {
      room.join('player1');
      room.join('player2');
      room.startGame();

      const fen = room.board.fen();
      expect(fen).toBeDefined();
      expect(fen.length).toBeGreaterThan(0);
    });
  });

  describe('makeMove()', () => {
    beforeEach(() => {
      room.join('player1');
      room.join('player2');
      room.startGame();
    });

    it('유효한 움직임을 수행할 수 있어야 함', () => {
      const result = room.makeMove({ source: 'e2', target: 'e4' });
      expect(result).toBe(true);
    });

    it('잘못된 움직임을 수행하면 false가 반환되어야 함', () => {
      const result = room.makeMove({ source: 'e2', target: 'e5' });
      expect(result).toBe(false);
    });
  });

  describe('finishGame()', () => {
    const WHITE_WIN_CHECKMATE_FEN =
      'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    beforeEach(() => {
      room.join('white');
      room.join('black');
      room.startGame('white');
    });
    it('게임을 정상적으로 종료할 수 있어야 함', () => {
      room.board.load(WHITE_WIN_CHECKMATE_FEN, { skipValidation: true });
      room.finishGame();
      expect(room.isPlaying).toBe(false);
    });

    it('승자의 닉네임과 게임 종료 이유를 반환해야 함', () => {
      // 흰색이 체크메이트로 승리하는 상황 설정
      room.board.load(WHITE_WIN_CHECKMATE_FEN, { skipValidation: true });
      expect(room.board.isCheckmate()).toBe(true);
      const { winner, reason } = room.finishGame();
      expect(typeof winner).toBe('string');
      expect(typeof reason).toBe('string');
    });

    it('종료 이유 없이 종료시 예외를 던져야 함', () => {
      expect(() => {
        room.finishGame();
      }).toThrow();
    });

    it('게임이 종료되면 플레이어들이 준비상태가 아니여야 함', () => {
      room.board.load(WHITE_WIN_CHECKMATE_FEN, { skipValidation: true });
      room.finishGame();
      room.players.forEach((player) => {
        expect(player.isReady).toBe(false);
      });
    });

    it('게임 진행중이 아닌데 호출하면 에러를 던져야 함', () => {
      room.board.load(WHITE_WIN_CHECKMATE_FEN, { skipValidation: true });
      room.finishGame(); //진행중 게임 종료
      expect(() => {
        room.finishGame(); //게임 시작하지 않고 또 종료
      }).toThrow();
    });

    describe('알맞은 승자와 게임 종료 사유를 문자열로 반환함', () => {
      it('백 체크메이트승', () => {
        // 흰색이 체크메이트로 승리하는 상황 설정
        room.board.load(WHITE_WIN_CHECKMATE_FEN, { skipValidation: true });
        expect(room.board.isCheckmate()).toBe(true);
        const { winner, reason } = room.finishGame();
        expect(winner).toBe('white');
        expect(reason).toBe('체크메이트');
      });
      it('흑 체크메이트승', () => {
        // Fool's Mate - 흑이 2수만에 체크메이트로 승리
        const BLACK_WIN_CHECKMATE_FEN =
          'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
        room.board.load(BLACK_WIN_CHECKMATE_FEN, { skipValidation: true });
        expect(room.board.isCheckmate()).toBe(true);
        const { winner, reason } = room.finishGame();
        expect(winner).toBe('black');
        expect(reason).toBe('체크메이트');
      });
      it('백이 기권', () => {
        const { winner, reason } = room.finishGame(gameEndReason.WHITE_RESIGN);
        expect(winner).toBe('black');
        expect(reason).toBe('기권');
      });
      it('흑이 기권', () => {
        const { winner, reason } = room.finishGame(gameEndReason.BLACK_RESIGN);
        expect(winner).toBe('white');
        expect(reason).toBe('기권');
      });
      it('무승부 제안 수락', () => {
        const { winner, reason } = room.finishGame(
          gameEndReason.DRAW_AGREEMENT,
        );
        expect(winner).toBeNull();
        expect(reason).toBe('합의');
      });
      it('퇴장', () => {
        room.leave('white');
        expect(room.isPlaying).toBe(true); //게임 종료 처리 안됨
        const { winner, reason } = room.finishGame();
        expect(winner).toBe('black');
        expect(reason).toBe('상대의 퇴장');
      });
      it('스테일메이트 무승부', () => {
        const STALEMATE_FEN = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
        // 스테일메이트 상황 설정
        room.board.load(STALEMATE_FEN, { skipValidation: true });
        expect(room.board.isStalemate()).toBe(true);
        const { winner, reason } = room.finishGame();
        expect(winner).toBeNull();
        expect(reason).toBe('스테일메이트');
      });
      it('50수 무승부', () => {
        // 50수 무승부는 halfmove clock이 100 이상일 때
        const FIFTY_MOVE_RULE_FEN = '7k/1r6/1r6/8/8/8/6R1/K5R1 w - - 999 999';
        room.board.load(FIFTY_MOVE_RULE_FEN, { skipValidation: true });
        expect(room.board.isDraw()).toBe(true);
        const { winner, reason } = room.finishGame();
        expect(winner).toBeNull();
        expect(reason).toBe('50수 규칙');
      });
      it('기물 부족', () => {
        const INSUFFICIENT_MATERIAL_FEN = '8/8/8/8/8/8/5k2/6K1 w - - 0 1';
        // 기물 부족 상황 설정
        room.board.load(INSUFFICIENT_MATERIAL_FEN, { skipValidation: true });
        expect(room.board.isDraw()).toBe(true);
        const { winner, reason } = room.finishGame();
        expect(winner).toBeNull();
        expect(reason).toBe('기물 부족');
      });
    });
  });
});
