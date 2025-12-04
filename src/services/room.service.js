import { getIO } from '../ws/server.js';
import { Chess } from 'chess.js';
import logger from '../utils/logger.js';

const READY_STATES = {
  NOT_READY: false,
  READY: true,
};

export class Room {
  constructor(id) {
    if (!id || typeof id !== 'string') {
      throw new Error('Room ID must be a non-empty string');
    }
    this.id = id;
    this.board = new Chess();
    this.players = [];
    this.whitePlayer = null;
    this.isPlaying = false;
  }

  setPlayerReady(nickname, isReady = undefined) {
    if (!nickname || typeof nickname !== 'string') {
      throw new Error('Valid nickname is required');
    }

    const player = this.players.find((p) => p.nickname === nickname);
    if (!player) {
      throw new Error(`Player not found: ${nickname}`);
    }

    // If isReady is not provided, toggle the current state
    player.isReady = isReady !== undefined ? isReady : !player.isReady;
    logger.debug(
      { roomId: this.id, nickname, isReady: player.isReady },
      '플레이어 준비 상태 변경',
    );
    return player.isReady;
  }

  startGame() {
    if (this.players.length !== 2) {
      throw new Error('Cannot start game: need exactly 2 players.');
    }
    if (!this.players[0].isReady || !this.players[1].isReady) {
      throw new Error('Cannot start game: all players must be ready.');
    }

    // Reset ready state after game starts
    for (const player of this.players) {
      player.isReady = false;
    }

    this.whitePlayer =
      Math.random() < 0.5 ? this.players[0].nickname : this.players[1].nickname;
    this.board.reset();
    this.isPlaying = true;

    logger.info(
      {
        roomId: this.id,
        whitePlayer: this.whitePlayer,
        players: this.players.map((p) => p.nickname),
      },
      '게임 시작',
    );
  }

  endGame(winner) {
    if (!this.isPlaying) {
      logger.warn({ roomId: this.id }, '게임이 진행 중이 아닌데 종료 시도');
      return null;
    }

    let reason = 'unknown';

    try {
      if (this.board.isCheckmate()) {
        reason = '체크메이트';
      } else if (this.board.isStalemate()) {
        reason = '스테일메이트';
      } else if (this.board.isThreefoldRepetition()) {
        reason = '삼중 반복';
      } else if (this.board.isInsufficientMaterial()) {
        reason = '불충분한 기물';
      } else if (this.board.isDraw()) {
        reason = '50수 무승부';
      }
    } catch (error) {
      logger.warn(
        { roomId: this.id, error: error.message },
        '게임 상태 확인 중 에러',
      );
    }

    this.isPlaying = false;
    logger.info({ roomId: this.id, winner, reason }, '게임 종료');

    return { winner, reason, finalFen: this.board.fen() };
  }

  makeMove(move, nickname) {
    if (!this.isPlaying) {
      return { error: '게임이 시작되지 않았습니다' };
    }

    if (!move || !nickname) {
      return { error: '이동 정보와 플레이어 정보가 필요합니다' };
    }

    try {
      const isPlayerWhite = this.isWhite(nickname);
      const isWhiteTurn = this.board.turn() === 'w';

      if (isPlayerWhite !== isWhiteTurn) {
        return { error: '당신의 차례가 아닙니다' };
      }

      const moveResult = this.board.move(move);

      if (!moveResult) {
        logger.warn({ roomId: this.id, nickname, move }, '잘못된 이동');
        return { error: '잘못된 이동입니다' };
      }

      logger.info(
        { roomId: this.id, nickname, move: moveResult.san },
        '기물 이동 성공',
      );

      const result = {
        fen: this.board.fen(),
        turn: this.board.turn(),
        move: moveResult.san,
        gameOver: this.board.isGameOver(),
      };

      if (result.gameOver) {
        result.winner = this.board.turn() === 'w' ? 'black' : 'white';
      }

      return result;
    } catch (error) {
      logger.error(
        { roomId: this.id, nickname, move, error: error.message },
        '이동 처리 중 에러',
      );
      return { error: '이동 처리 중 에러가 발생했습니다' };
    }
  }

  canJoin() {
    return this.players.length < 2 && !this.isPlaying;
  }

  join(nickname) {
    if (!nickname || typeof nickname !== 'string') {
      throw new Error('Valid nickname is required');
    }

    if (this.players.find((p) => p.nickname === nickname)) {
      logger.warn(
        { roomId: this.id, nickname },
        '이미 참가한 플레이어 중복 참가 시도',
      );
      return;
    }

    if (this.players.length >= 2) {
      throw new Error('방이 가득 찼습니다');
    }

    if (this.isPlaying) {
      throw new Error('게임이 진행 중입니다');
    }

    this.players.push({ nickname, isReady: READY_STATES.NOT_READY });
    logger.info(
      { roomId: this.id, nickname, playerCount: this.players.length },
      '플레이어 입장',
    );
  }

  leave(nickname) {
    if (!nickname || typeof nickname !== 'string') {
      logger.warn({ roomId: this.id }, '유효하지 않은 nickname');
      return;
    }

    const initialLength = this.players.length;
    this.players = this.players.filter((p) => p.nickname !== nickname);

    if (this.players.length < initialLength) {
      logger.info(
        { roomId: this.id, nickname, remainingPlayers: this.players.length },
        '플레이어 퇴장',
      );

      // If game was playing and someone left, end it
      if (this.isPlaying) {
        this.isPlaying = false;
        logger.warn(
          { roomId: this.id, nickname },
          '플레이어 퇴장으로 게임 중단',
        );
      }
    }
  }

  isWhite(nickname) {
    if (!nickname) return false;
    return this.whitePlayer === nickname;
  }

  getRoomInfo() {
    return {
      gameData: {
        boardFen: this.board.fen(),
        turn: this.board.turn(),
      },
      playerData: {
        players: this.players,
        isPlaying: this.isPlaying,
        whitePlayer: this.whitePlayer,
      },
    };
  }

  isMyTurn(nickname) {
    if (!nickname) return false;
    const isPlayerWhite = this.isWhite(nickname);
    const isWhiteTurn = this.board.turn() === 'w';
    return isPlayerWhite === isWhiteTurn;
  }
}
