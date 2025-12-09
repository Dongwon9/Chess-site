import { getRoomData, roomId, socket } from './room.js';
const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const chessBoardConfig = {
  draggable: true,
  position: EMPTY_BOARD_FEN,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
};

const board = Chessboard('chessBoard', chessBoardConfig);

export function updateBoard() {
  const { gameData, me } = getRoomData();
  if (gameData.isPlaying) {
    board.position(gameData.boardFen);
    board.orientation(me.color === 'w' ? 'white' : 'black');
  }
}

function onDragStart(source, piece) {
  const { gameData, me } = getRoomData();
  if (!gameData.isPlaying) {
    console.error('게임이 시작되지 않음');
    return false;
  }
  if (gameData.turnPlayer !== me.nickname) {
    console.error('내 차례가 아님');
    return false;
  }
  if (piece.search(new RegExp(`^${me.color}`)) === -1) {
    console.error('내 말이 아님');
    return false;
  }
}

async function onDrop(source, target, piece, newPos, oldPos) {
  const success = await socket.emitWithAck('makeMove', {
    roomId,
    source,
    target,
  });
  console.log('Move success:', success);
  if (!success) {
    board.position(oldPos);
    return;
  }
}

function onSnapEnd() {
  const { gameData } = getRoomData();
  board.position(gameData.boardFen);
}
