import getServer from '../ws/server';
import { Chess } from 'chess.js';

export class Room {
  static Rooms = [];

  constructor(creatorNickname) {
    this.board = new Chess();
    this.players = [];
    this.players.push({ nickname: creatorNickname, isReady: false });
    this.whitePlayer = null;
    this.name = creatorNickname;
    this.isPlaying = false;
  }

  setPlayerReady(nickname, isReady) {
    const player = this.players.find((p) => p.nickname === nickname);
    if (player) {
      player.isReady = isReady;
    }
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
  endGame(winnerNickname) {
    let endReason;
    if (this.board.isCheckmate()) {
      endReason = '체크메이트';
    } else if (this.board.isStalemate()) {
      endReason = '스테일메이트';
    } else if (this.board.isThreefoldRepetition()) {
      endReason = '삼중 반복';
    } else if (this.board.isInsufficientMaterial()) {
      endReason = '불충분한 기물';
    } else if (this.board.isDrawByFiftyMoves()) {
      endReason = '50수 무승부';
    }
    this.isPlaying = false;
  }
  makeMove(move) {
    try {
      this.board.move(move);
    } catch (error) {
      //오류 처리
      return;
    }
    getServer()
      .to(this.name)
      .emit('boardUpdate', { move, newFen: this.board.fen() });
  }

  getRoom(nickname) {
    return Room.Rooms.find((room) => room.name === nickname);
  }
}
