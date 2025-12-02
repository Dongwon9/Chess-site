import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';
console.log('안녕')
const roomId = new URLSearchParams(window.location.search).get('id');
if (!roomId) {
  alert('유효하지 않은 방 ID입니다.');
  window.location.href = '/lobby.html';
}
const nickname = getNickname();
document.getElementById('myName').innerText = nickname;
const socket = io({
  query: {
    toRoom: roomId,
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

socket.on('updateRoom', (info) => {
  const { boardFen, players, isPlaying } = info;
  console.log(info);
  board.position(boardFen);
  const opponent = players.find((player) => player.nickname !== nickname);
  const me = players.find((player) => player.nickname === nickname);

  opponentNameElement.innerText = opponent ? opponent.nickname : '대기 중';
  if (opponent) {
    opponentReadyElement.innerText = opponent.isReady ? '[준비 완료]' : '[준비중...]';
  } else {
    opponentReadyElement.innerText = '';
  }

  meReadyElement.innerText = me.isReady ? '[준비 완료]' : '[준비중...]';
  readyButton.innerText = me.isReady ? '준비 취소' : '준비';
  readyButton.disabled = isPlaying;
});

document.getElementById('readyButton').addEventListener('click', () => {
  socket.emit('playerReady', { nickname, roomId });
});
