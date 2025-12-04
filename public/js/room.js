import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';
const roomId = new URLSearchParams(window.location.search).get('id');
const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'; /* 빈 체스판 FEN 문자열 */
if (!roomId) {
  alert('유효하지 않은 방 ID입니다.');
  window.location.href = '/lobby.html';
}
const nickname = getNickname();
document.getElementById('myName').innerText = nickname;
const socket = io({
  query: {
    location: roomId,
    nickname,
  },
});

const opponentNameElement = document.getElementById('opponentName');
const opponentReadyElement = document.getElementById('opponentReady');
const meReadyElement = document.getElementById('meReady');
const readyButton = document.getElementById('readyButton');
const board = Chessboard('chessBoard', {
  position: EMPTY_BOARD_FEN,
  draggable: false,
});
//플레이어는 입장하자마자 준비 상태
playerReady();
readyButton.addEventListener('click', playerReady);

function playerReady() {
  socket.emit('togglePlayerReady', { nickname, roomId });
}

socket.on('updateRoom', (data) => {
  const { gameData, playerData } = data;
  const opponent = playerData.players.find((p) => p.nickname !== nickname);
  const me = playerData.players.find((p) => p.nickname === nickname);
  if (!opponent) {
    opponentNameElement.innerText = '상대를 기다리는 중...';
    opponentReadyElement.innerText = '';
  } else {
    opponentNameElement.innerText = opponent.nickname;
    opponentReadyElement.innerText = opponent.isReady ? '준비 완료' : '대기 중';
  }

  meReadyElement.innerText = me.isReady ? '준비 완료' : '대기 중';
  readyButton.innerText = me.isReady ? '준비 취소' : '준비';

  board.draggable = playerData.isPlaying && gameData.turnPlayer === nickname;
  if (playerData.isPlaying) {
    board.position(gameData.boardFen);
    board.orientation(me.color === 'w' ? 'white' : 'black');
  } else {
    board.position(EMPTY_BOARD_FEN);
    board.orientation('white');
  }
});
