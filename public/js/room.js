import { updateBoard } from './boardManager.js';
import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';
const roomId = new URLSearchParams(window.location.search).get('id');

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

let roomData = {};
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
  const { gameData, playerData } = data;
  const opponent = playerData.players.find((p) => p.nickname !== nickname);
  const me = playerData.players.find((p) => p.nickname === nickname);
  roomData = { gameData, me };

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

  updateBoard();

  if (gameData.isPlaying) {
    readyButton.innerHTML = '게임 진행 중...';
    readyButton.disabled = true;
  } else {
    readyButton.innerText = me.isReady ? '준비 취소' : '준비하기';
    readyButton.disabled = false;
  }
});

function getRoomData() {
  return roomData;
}
export { socket, roomId, getRoomData };
