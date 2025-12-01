import { io } from 'socket.io-client';
import { getNickname } from './js/getNickname.js';
const socket = io();
const nickname = getNickname();
document.getElementById('nickname').innerText = nickname;

document.getElementById('createRoom').addEventListener('click', async () => {
  const { success } = await fetch('/lobby/create-room', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomName: nickname }),
  });
  if (success) {
    window.location.href = `/room.html?id=${nickname}`;
  }
});

socket.on('updateLobby', (rooms) => {
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '';
  if (rooms.length === 0) {
    const li = document.createElement('li');
    li.innerText = '방이 없습니다.';
    roomList.appendChild(li);
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement('li');
    li.innerText = room.name;
    const button = document.createElement('button');
    button.innerText = '입장';
    button.onclick = () => {
      window.location.href = `/room.html?id=${room.id}`;
    };
    li.appendChild(button);
    roomList.appendChild(li);
  });
});

document
  .getElementById('changeNickname')
  .addEventListener('click', async () => {
    sessionStorage.removeItem('nickname');
    nickname = getNickname();
    document.getElementById('nickname').innerText = nickname;
  });
