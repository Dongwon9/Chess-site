import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';

const roomId = new URLSearchParams(window.location.search).get('id');
const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

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
//FIXME 말이 드래그가 안됨
const board = Chessboard('chessBoard', {
  position: EMPTY_BOARD_FEN,
  draggable: false,
});

// 플레이어는 입장하자마자 준비 상태
playerReady();
readyButton.addEventListener('click', playerReady);

function playerReady() {
  socket.emit('togglePlayerReady', { nickname, roomId });
}

function updateStatusIndicator(element, isReady) {
  const indicator = element.previousElementSibling;
  if (isReady) {
    indicator.className = 'status-indicator ready';
    element.className = 'status-ready';
    element.innerText = '준비 완료';
  } else {
    indicator.className = 'status-indicator waiting';
    element.className = 'status-waiting';
    element.innerText = '대기 중';
  }
}

socket.on('updateRoom', (data) => {
  console.log(data);
  const { gameData, playerData } = data;
  const opponent = playerData.players.find((p) => p.nickname !== nickname);
  const me = playerData.players.find((p) => p.nickname === nickname);

  // Update opponent info
  if (!opponent) {
    opponentNameElement.innerText = '상대를 기다리는 중...';
    opponentReadyElement.innerText = '대기 중...';
    opponentReadyElement.className = 'status-waiting';
  } else {
    opponentNameElement.innerText = opponent.nickname;
    updateStatusIndicator(opponentReadyElement, opponent.isReady);
  }

  // Update my status
  updateStatusIndicator(meReadyElement, me.isReady);
  readyButton.innerText = me.isReady ? '준비 취소' : '준비하기';

  // Update board
  if (playerData.isPlaying) {
    board.position(gameData.boardFen);
    board.orientation(me.color === 'w' ? 'white' : 'black');
    readyButton.innerHTML = '게임 진행 중...';
    readyButton.disabled = true;
  } else {
    board.position(EMPTY_BOARD_FEN);
    board.orientation('white');
  }
});
