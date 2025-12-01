import { io } from 'https://esm.sh/socket.io-client';
import { getNickname } from './getNickname.js';
const socket = io({
  query: {
    toRoom: 'lobby',
  },
});
const nickname = getNickname();
document.getElementById('nickname').innerText = nickname;

document.getElementById('createRoom').addEventListener('click', async () => {
  const { id } = await fetch('/lobby/create-room', {
    method: 'POST',
  });
  if (id) {
    window.location.href = `/room.html?id=${id}`;
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

  rooms.forEach((roomId) => {
    const li = document.createElement('li');
    li.innerText = roomId;
    const button = document.createElement('button');
    button.innerText = '입장';
    button.onclick = () => {
      window.location.href = `/room.html?id=${roomId}`;
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
