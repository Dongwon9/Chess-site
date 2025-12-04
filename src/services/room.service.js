import { getIO } from '../ws/server.js';
import { Chess } from 'chess.js';
import logger from '../utils/logger.js';

export class Room {
  constructor(id) {
    this.id = id;
    this.board = new Chess();
    this.players = [];
    this.whitePlayer = null;
    this.isPlaying = false;
  }

  setPlayerReady(nickname, isReady = undefined) {
    const player = this.players.find((p) => p.nickname === nickname);
    if (!player) {
      throw new Error(`Player not found: ${nickname}`);
    }
    // If isReady is not provided, toggle the current state
    player.isReady = isReady !== undefined ? isReady : !player.isReady;
    return player.isReady;
  }

  startGame() {
    if (this.players.length !== 2) {
      throw new Error('Cannot start game: need exactly 2 players.');
    }
    if (!this.players[0].isReady || !this.players[1].isReady) {
      throw new Error('Cannot start game: all players must be ready.');
    }
    for (const player of this.players) {
      player.isReady = false;
    }
    this.whitePlayer =
      Math.random() < 0.5 ? this.players[0].nickname : this.players[1].nickname;
    this.board.reset();
    this.isPlaying = true;
  }
  endGame(winner) {
    let reason;
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
    } else {
      reason = '기타';
    }
    this.isPlaying = false;
    logger.info({ roomId: this.id, winner, reason }, '게임 종료');
    return { winner, reason, finalFen: this.board.fen() };
  }
  makeMove(move, nickname) {
    if (!this.isPlaying) {
      return { error: '게임이 시작되지 않았습니다' };
    }

    const isPlayerWhite = this.isWhite(nickname);
    const isWhiteTurn = this.board.turn() === 'w';

    if (isPlayerWhite !== isWhiteTurn) {
      return { error: '당신의 차례가 아닙니다' };
    }

    try {
      this.board.move(move);
      logger.info(
        { roomId: this.id, nickname, move: move.from + move.to },
        '기물 이동',
      );

      const result = {
        fen: this.board.fen(),
        turn: this.board.turn(),
        gameOver: this.board.isGameOver(),
      };

      if (result.gameOver) {
        result.winner = this.board.turn() === 'w' ? 'black' : 'white';
      }

      return result;
    } catch (error) {
      logger.warn(
        { roomId: this.id, nickname, move, error: error.message },
        '잘못된 이동 시도',
      );
      return { error: '잘못된 이동입니다' };
    }
  }
  canJoin() {
    return this.players.length < 2 && !this.isPlaying;
  }

  join(nickname) {
    if (!nickname) {
      throw new Error('Nickname is required');
    }
    if (this.players.find((p) => p.nickname === nickname)) {
      logger.error({ roomId: this.id, nickname }, '이미 참가한 플레이어');
      return;
    }
    if (this.players.length >= 2) {
      throw new Error('방이 가득 찼습니다');
    }
    if (this.isPlaying) {
      throw new Error('게임이 진행 중입니다');
    }
    this.players.push({ nickname, isReady: false });
    logger.info(
      { roomId: this.id, nickname, playerCount: this.players.length },
      '플레이어 입장',
    );
  }

  leaveRoom(nickname) {
    this.players = this.players.filter((p) => p.nickname !== nickname);
  }

  isWhite(nickname) {
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
    const isPlayerWhite = this.isWhite(nickname);
    const isWhiteTurn = this.board.turn() === 'w';
    return isPlayerWhite === isWhiteTurn;
  }
}
