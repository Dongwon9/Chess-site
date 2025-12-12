import { Chess } from 'chess.js';
import logger from '../utils/logger.js';
import { v4 } from 'uuid';
import { DELETE_ROOM, emitEvent, UPDATE_LOBBY } from '../events/lobby.event.js';
export const gameEndReason = {
  WHITE_RESIGN: 'whiteResign',
  BLACK_RESIGN: 'blackResign',
  DRAW_AGREEMENT: 'drawAgreement',
};
Object.freeze(gameEndReason);

export class Room {
  constructor(id = null) {
    this.id = id ?? v4();
    this.board = new Chess();
    this.players = [];
    this.isPlaying = false;
    this.drawCalledPlayers = new Set();
  }
  callDraw(nickname) {
    if (!this.isPlaying) {
      throw new Error('게임이 진행 중이지 않습니다');
    }
    const player = this.players.find((p) => p.nickname === nickname);
    if (!player) {
      throw new Error('플레이어를 찾을 수 없습니다');
    }
    this.drawCalledPlayers.add(nickname);

    const allAgreed = this.players.every((p) =>
      this.drawCalledPlayers.has(p.nickname),
    );
    if (allAgreed) {
      this.drawCalledPlayers.clear();
      return this.finishGame(gameEndReason.DRAW_AGREEMENT);
    }
  }

  togglePlayerReady(nickname) {
    const player = this.players.find((p) => p.nickname === nickname);
    if (!player) {
      throw new Error('Player not found in room');
    }
    player.isReady = !player.isReady;
    //두명 다 준비되었으면 게임 시작
    if (
      this.players.length === 2 &&
      this.players.every((p) => p.isReady) &&
      !this.isPlaying
    ) {
      this.startGame();
    }
    return player.isReady;
  }

  startGame(whitePlayer = null) {
    this.board.reset();
    this.isPlaying = true;
    const white = this.players.find((p) => p.nickname === whitePlayer);
    if (white) {
      white.color = 'w';
    } else {
      if (whitePlayer !== null) {
        logger.warn(
          { roomId: this.id, whitePlayer },
          '지정된 플레이어를 찾을 수 없음',
        );
      }
      if (Math.random() < 0.5) {
        this.players[0].color = 'w';
      } else {
        this.players[1].color = 'w';
      }
    }
    this.players.find((p) => p.color !== 'w').color = 'b';
    this.board.setHeader(
      'White',
      this.players.find((p) => p.color === 'w').nickname,
    );
    this.board.setHeader(
      'Black',
      this.players.find((p) => p.color === 'b').nickname,
    );
    logger.info(
      {
        roomId: this.id,
        players: this.players.map((p) => {
          return { nickname: p.nickname, color: p.color };
        }),
      },
      '게임 시작',
    );
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

    if (this.isPlaying) {
      throw new Error('게임이 진행 중입니다');
    }

    if (this.players.length >= 2) {
      throw new Error('방이 가득 찼습니다');
    }

    this.players.push({ nickname, isReady: true, color: null });
    logger.info(
      { roomId: this.id, nickname, playerCount: this.players.length },
      '플레이어 입장',
    );
    emitEvent(UPDATE_LOBBY);
  }

  leave(nickname) {
    if (!nickname || typeof nickname !== 'string') {
      logger.warn({ roomId: this.id }, '유효하지 않은 nickname');
      return;
    }
    this.players = this.players.filter((p) => p.nickname !== nickname);
    if (this.players.length === 0) {
      emitEvent(DELETE_ROOM, this.id);
    }
    logger.info({ roomId: this.id, nickname }, '플레이어 퇴장');
  }

  getRoomInfo() {
    return {
      gameData: {
        boardFen: this.board.fen(),
        turnPlayer: this.getTurnPlayer(),
        isPlaying: this.isPlaying,
      },
      playerData: {
        players: this.players,
      },
    };
  }
  /** 누구의 차례인지 닉네임을 반환 */
  getTurnPlayer() {
    if (!this.isPlaying) return null;
    const turn = this.board.turn();
    return this.players.find((p) => p.color === turn)?.nickname || null;
  }

  makeMove({ source, target }) {
    try {
      this.board.move({ from: source, to: target });
      return true;
    } catch {
      return false;
    }
  }

  getWhiteAndBlackPlayers() {
    const white = this.players.find((p) => p.color === 'w') || null;
    const black = this.players.find((p) => p.color === 'b') || null;
    return { white, black };
  }
  resignGame(resigningPlayer) {
    const player = this.players.find((p) => p.nickname === resigningPlayer);
    if (!player) {
      throw Error('플레이어를 찾지 못했습니다.');
    }
    const finishReason =
      player.color === 'w'
        ? gameEndReason.WHITE_RESIGN
        : gameEndReason.BLACK_RESIGN;
    return this.finishGame(finishReason);
  }
  finishGame(finishReason = null) {
    if (!this.isPlaying) {
      throw Error('게임이 진행중이 아닙니다');
    }
    const { white, black } = this.getWhiteAndBlackPlayers();
    const whiteName = white ? white.nickname : 'Unknown';
    const blackName = black ? black.nickname : 'Unknown';
    let winner = undefined;
    let reason = undefined;

    // 퇴장으로 인한 게임 종료 체크
    if (this.players.length === 1) {
      winner = this.players[0].nickname;
      reason = '상대의 퇴장';
    } else if (finishReason === null && !this.board.isGameOver()) {
      throw new Error('게임이 아직 종료되지 않았습니다');
    } else if (finishReason !== null) {
      switch (finishReason) {
        case gameEndReason.WHITE_RESIGN:
          winner = blackName;
          reason = '기권';
          break;
        case gameEndReason.BLACK_RESIGN:
          winner = whiteName;
          reason = '기권';
          break;
        case gameEndReason.DRAW_AGREEMENT:
          winner = null;
          reason = '합의';
          break;
        default:
          logger.error('알 수 없는 종료 이유:', finishReason);
      }
    } else if (this.board.isCheckmate()) {
      // 체크메이트는 현재 턴 플레이어가 진 것임
      winner = this.board.turn() === 'w' ? blackName : whiteName;
      reason = '체크메이트';
    } else if (this.board.isStalemate()) {
      winner = null;
      reason = '스테일메이트';
    } else if (this.board.isInsufficientMaterial()) {
      winner = null;
      reason = '기물 부족';
    } else if (this.board.isThreefoldRepetition()) {
      winner = null;
      reason = '삼회 반복';
    } else if (this.board.isDrawByFiftyMoves()) {
      winner = null;
      reason = '50수 규칙';
    }
    if (winner === undefined || reason === undefined) {
      throw new Error('게임 종료 사유를 결정할 수 없습니다');
    }

    this.isPlaying = false;
    this.players.forEach((p) => {
      p.isReady = false;
      p.color = null;
    });
    logger.info({ roomId: this.id }, '게임 종료');
    emitEvent(UPDATE_LOBBY);
    return { winner, reason };
  }
}
