import { getIO } from '../ws/server.js';
import { Chess } from 'chess.js';
import logger from '../utils/logger.js';
import { v4 } from 'uuid';
import { deleteRoom } from './lobby.service.js';
//TODO 게임 종료 로직
export class Room {
  constructor(id = null) {
    this.id = id ?? v4();
    this.board = new Chess();
    this.players = [];
    this.isPlaying = false;
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

  startGame() {
    this.board.reset();
    this.isPlaying = true;
    if (Math.random() < 0.5) {
      this.players[0].color = 'w';
      this.players[1].color = 'b';
    } else {
      this.players[0].color = 'b';
      this.players[1].color = 'w';
    }
    logger.info(
      {
        roomId: this.id,
        players: this.players.map((p) => p.nickname),
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

    if (this.players.length >= 2) {
      throw new Error('방이 가득 찼습니다');
    }

    if (this.isPlaying) {
      throw new Error('게임이 진행 중입니다');
    }

    this.players.push({ nickname, isReady: true, color: null });
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
    this.players = this.players.filter((p) => p.nickname !== nickname);
    if (this.players.length === 0) {
      deleteRoom(this.id);
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
  ///누구의 차례인지 닉네임을 반환
  getTurnPlayer() {
    if (!this.isPlaying) return null;
    const turn = this.board.turn();
    return this.players.find((p) => p.color === turn)?.nickname || null;
  }
  makeMove({ source, target }) {
    try {
      this.board.move({ from: source, to: target });
      return true;
    } catch (error) {
      return false;
    }
  }
}
