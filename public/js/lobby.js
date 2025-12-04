import { io } from 'https://esm.sh/socket.io-client';
import { getNickname } from './getNickname.js';

const socket = io({
  query: {
    location: 'lobby',
  },
});

let nickname = getNickname();
document.getElementById('nickname').innerText = nickname;

document.getElementById('createRoom').addEventListener('click', async () => {
  const roomName = prompt('방 이름을 입력하세요.\n(미입력시 자동 생성)');

  const response = await fetch('/lobby/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName }),
  });
  const data = await response.json();
  if (data.success) {
    window.location.href = `/room.html?id=${data.roomId}`;
  } else {
    alert(data.message);
  }
});

socket.on('updateLobby', (rooms) => {
  const roomList = document.getElementById('roomList');
  const emptyState = document.getElementById('emptyState');

  roomList.innerHTML = '';

  if (rooms.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  rooms.forEach((roomId) => {
    const li = document.createElement('li');
    li.className = 'room-item';

    const roomName = document.createElement('span');
    roomName.className = 'room-item-name';
    roomName.innerText = roomId;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'room-item-button';

    const button = document.createElement('button');
    button.className = 'btn-primary';
    button.innerText = '입장';
    button.onclick = () => {
      window.location.href = `/room.html?id=${roomId}`;
    };

    buttonContainer.appendChild(button);
    li.appendChild(roomName);
    li.appendChild(buttonContainer);
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
