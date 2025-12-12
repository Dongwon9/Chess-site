// socket.io-client는 서버에서 제공되는 글로벌 `io`를 사용합니다.
import { getNickname } from './getNickname.js';

const CONSTANTS = {
  SOCKET_LOCATION: 'lobby',
  API_CREATE_ROOM: '/lobby/create-room',
};

const DOM_ELEMENTS = {
  nicknameDisplay: null,
  createRoomBtn: null,
  changeNicknameBtn: null,
  roomList: null,
  emptyState: null,
};

let socket = null;
let currentNickname = null;

/**
 * 애플리케이션 초기화
 */
function initializeApp() {
  try {
    cacheDOMElements();
    currentNickname = getNickname();
    updateNicknameDisplay();
    initializeSocket();
    setupEventListeners();
  } catch (error) {
    console.error('애플리케이션 초기화 실패:', error);
    alert('오류가 발생했습니다.');
  }
}

/**
 * DOM 요소 캐싱
 */
function cacheDOMElements() {
  DOM_ELEMENTS.nicknameDisplay = document.getElementById('nickname');
  DOM_ELEMENTS.createRoomBtn = document.getElementById('createRoom');
  DOM_ELEMENTS.changeNicknameBtn = document.getElementById('changeNickname');
  DOM_ELEMENTS.roomList = document.getElementById('roomList');
  DOM_ELEMENTS.emptyState = document.getElementById('emptyState');

  const missing = Object.entries(DOM_ELEMENTS)
    .filter(([, el]) => !el)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`필수 DOM 요소 누락: ${missing.join(', ')}`);
  }
}

/**
 * 소켓 초기화
 */
function initializeSocket() {
  try {
    socket = io({
      query: {
        location: CONSTANTS.SOCKET_LOCATION,
        nickname: currentNickname,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('updateLobby', handleLobbyUpdate);
    socket.on('error', handleSocketError);
  } catch (error) {
    console.error('소켓 초기화 실패:', error);
    throw error;
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  DOM_ELEMENTS.createRoomBtn.addEventListener('click', handleCreateRoom);
  DOM_ELEMENTS.changeNicknameBtn.addEventListener(
    'click',
    handleChangeNickname,
  );
}

/**
 * 방 생성 핸들러
 */
async function handleCreateRoom() {
  try {
    const roomName = prompt('방 이름을 입력하세요.\n(미입력시 자동 생성)');

    const response = await fetch(CONSTANTS.API_CREATE_ROOM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: roomName || undefined }),
    });

    if (!response.ok) {
      throw new Error(`HTTP 에러: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || '방 생성 실패');
    }

    window.location.href = `/room.html?id=${encodeURIComponent(data.roomId)}`;
  } catch (error) {
    console.error('방 생성 실패:', error);
    alert(error.message || '방 생성에 실패했습니다.');
  }
}

/**
 * 닉네임 변경 핸들러
 */
function handleChangeNickname() {
  try {
    sessionStorage.removeItem('nickname');
    currentNickname = getNickname();
    updateNicknameDisplay();
  } catch (error) {
    console.error('닉네임 변경 실패:', error);
  }
}

/**
 * 닉네임 표시 업데이트
 */
function updateNicknameDisplay() {
  DOM_ELEMENTS.nicknameDisplay.textContent = currentNickname;
}

/**
 * 로비 업데이트 핸들러
 */
function handleLobbyUpdate(rooms) {
  try {
    if (!Array.isArray(rooms)) {
      throw new Error('유효하지 않은 방 목록 데이터');
    }

    renderRoomList(rooms);
  } catch (error) {
    console.error('로비 업데이트 처리 실패:', error);
  }
}

/**
 * 방 목록 렌더링
 */
function renderRoomList(rooms) {
  DOM_ELEMENTS.roomList.innerHTML = '';

  if (rooms.length === 0) {
    DOM_ELEMENTS.emptyState.style.display = 'block';
    return;
  }

  DOM_ELEMENTS.emptyState.style.display = 'none';

  rooms.forEach((roomId) => {
    const roomElement = createRoomElement(roomId);
    DOM_ELEMENTS.roomList.appendChild(roomElement);
  });
}

/**
 * 방 요소 생성
 */
function createRoomElement(roomId) {
  const li = document.createElement('li');
  li.className = 'room-item';

  const roomName = document.createElement('span');
  roomName.className = 'room-item-name';
  roomName.textContent = roomId;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'room-item-button';

  const button = document.createElement('button');
  button.className = 'btn-primary';
  button.textContent = '입장';
  button.addEventListener('click', () => handleJoinRoom(roomId));

  buttonContainer.appendChild(button);
  li.appendChild(roomName);
  li.appendChild(buttonContainer);

  return li;
}

/**
 * 방 입장 핸들러
 */
function handleJoinRoom(roomId) {
  try {
    window.location.href = `/room.html?id=${encodeURIComponent(roomId)}`;
  } catch (error) {
    console.error('방 입장 실패:', error);
    alert('방 입장에 실패했습니다.');
  }
}

/**
 * 소켓 에러 핸들러
 */
function handleSocketError(error) {
  console.error('소켓 에러:', error);
}

/**
 * 페이지 언로드 시 리소스 정리
 */
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.disconnect();
  }
});

// 앱 초기화
initializeApp();
