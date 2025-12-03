import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';
console.log('안녕');
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
const board = Chessboard('chessBoard', {
  position: 'start',
  draggable: false,
});

readyButton.addEventListener('click', () => {
  socket.emit('playerReady', { nickname, roomId }, (data) => {
    const { gameData, playerData } = data;
    const opponent = playerData.players.find((p) => p.nickname !== nickname);
    const me = playerData.players.find((p) => p.nickname === nickname);
    opponentNameElement.innerText = opponent.nickname;
    opponentReadyElement.innerText = opponent.isReady ? '준비 완료' : '대기 중';
    meReadyElement.innerText = me.isReady ? '준비 완료' : '대기 중';
    readyButton.innerText = me.isReady ? '준비 취소' : '준비 완료';
  });
});
