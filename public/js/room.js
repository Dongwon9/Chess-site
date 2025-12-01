import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';

const roomId = new URLSearchParams(window.location.search).get('id');
const socket = io({
  query: {
    toRoom: roomId,
  },
});
const nickname = getNickname();
document.getElementById('myName').innerText = nickname;
const opponentNameElement = document.getElementById('opponentName');
const board = Chessboard('chessBoard');

socket.on('updateRoom', (info) => {
  const { boardFen, players, isPlaying } = info;
  board.position(boardFen);
  const opponent = players.find((name) => name !== nickname);
  opponentNameElement.innerText = opponent ? opponent : '대기 중';
});
