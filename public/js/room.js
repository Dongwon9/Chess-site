import getNickname from './utils/getNickname.js';
import { io } from 'socket.io-client';

const roomId = new URLSearchParams(window.location.search).get('id');

const room = await fetch(`/rooms/get-room?id=${roomId}`).then((res) =>
  res.json(),
);

const socket = io();
socket.joinRoom(roomId);
const nickname = getNickname();
document.getElementById('myName').innerText = nickname;
room.joinRoom(nickname);
const opponentNameElement = document.getElementById('opponentName');
updateOpponent();

const board = ChessBoard('chessBoard');

function updateOpponent() {
  const opponentNickname = room.getOpponentOf(nickname);
  opponentNameElement.innerText = opponentNickname
    ? opponentNickname
    : '상대를 기다리는중...';
}
