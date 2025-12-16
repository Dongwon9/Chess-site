import { updateBoard } from './boardManager.js';
import { createDialog } from './util.js';
import { getNickname } from './getNickname.js';
// socket.io-client는 서버에서 제공되는 글로벌 `io`를 사용합니다.
/* global io */

/**
 * DOM 요소 선택자 상수
 */
const DOM_SELECTORS = {
  opponentName: '#opponentName',
  opponentReady: '#opponentReady',
  readyButton: '#readyButton',
  myName: '#myName',
  leave: '#leave',
  callDraw: '#callDraw',
};

/**
 * 방 상태 관리 객체
 * @type {{gameData: object|null, me: object|null, opponent: object|null}}
 */
const ROOM_STATE = {
  gameData: null,
  me: null,
  opponent: null,
};

let socket = null;
let roomId = null;
let nickname = null;
let domElements = {};

function redirectToLobby() {
  if (typeof window === 'undefined') return;
  if (typeof window.__NAVIGATE_TO_LOBBY__ === 'function') {
    window.__NAVIGATE_TO_LOBBY__('/lobby.html');
    return;
  }
  if (typeof window.location?.assign === 'function') {
    window.location.assign('/lobby.html');
  } else {
    window.location.href = '/lobby.html';
  }
}

/**
 * 애플리케이션 초기화
 */
function initializeApp() {
  try {
    roomId = new URLSearchParams(window.location.search).get('id');
    if (!roomId) {
      throw new Error('유효하지 않은 방 ID입니다.');
    }

    nickname = getNickname();
    cacheDOMElements();
    initializeSocket();
    setupEventListeners();
    autoReadyOnJoin();
  } catch (error) {
    handleFatalError(error);
  }
}

/**
 * DOM 요소 캐싱 (반복 쿼리 방지)
 */
function cacheDOMElements() {
  domElements = {
    myName: document.getElementById(DOM_SELECTORS.myName.slice(1)),
    opponentName: document.getElementById(DOM_SELECTORS.opponentName.slice(1)),
    opponentReady: document.getElementById(
      DOM_SELECTORS.opponentReady.slice(1),
    ),
    readyButton: document.getElementById(DOM_SELECTORS.readyButton.slice(1)),
    leave: document.getElementById(DOM_SELECTORS.leave.slice(1)),
    callDraw: document.getElementById(DOM_SELECTORS.callDraw.slice(1)),
  };

  if (Object.values(domElements).some((el) => !el)) {
    throw new Error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  domElements.myName.textContent = nickname;
}

/**
 * 소켓 초기화
 */
function initializeSocket() {
  try {
    socket = io({
      query: {
        location: roomId,
        nickname,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('updateRoom', handleRoomUpdate);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleSocketError);
    socket.on('drawCalled', () => {
      console.log('무승부 제안됨');
    });
  } catch (error) {
    handleFatalError(new Error(`소켓 초기화 실패: ${error.message}`));
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  domElements.readyButton.addEventListener('click', handleReadyButtonClick);

  domElements.leave.addEventListener('click', () => {
    if (!ROOM_STATE.gameData?.isPlaying) {
      if (socket) {
        socket.disconnect();
      }
      redirectToLobby();
    } else {
      createDialog({
        title: '게임 중단 확인',
        message: '정말로 나가시겠습니까?\n 진행중인 게임은 패배 처리됩니다.',
        confirmText: '나가기',
        onConfirm: () => {
          if (socket) {
            socket.disconnect();
          }
          redirectToLobby();
        },
        isDanger: true,
      });
    }
  });

  domElements.callDraw.addEventListener('click', () => {
    try {
      socket.emit('callDraw', { roomId, nickname });
    } catch (error) {
      console.error('무승부 요청 실패:', error);
    }
  });
}

/**
 * 준비 버튼 클릭 핸들러
 */
function handleReadyButtonClick() {
  if (!socket) return;
  if (!ROOM_STATE.gameData?.isPlaying) {
    try {
      socket.emit('playerReady', { nickname, roomId });
    } catch (error) {
      console.error('준비 상태 전송 실패:', error);
    }
  } else {
    createDialog({
      title: '기권 확인',
      message: '정말로 기권하시겠습니까?',
      confirmText: '기권',
      onConfirm: () => {
        try {
          socket.emit('resign', { roomId, nickname });
        } catch (error) {
          console.error('포기는 허용되지 않았다.\n오류 내용:', error);
        }
      },
      isDanger: true,
    });
  }
}

/**
 * 자동 준비 (입장 시)
 */
function autoReadyOnJoin() {
  if (socket) {
    socket.emit('playerReady', { nickname, roomId });
  }
}

/**
 * 방 정보 업데이트 핸들러
 */
function handleRoomUpdate(data) {
  try {
    if (!data) {
      throw new Error('방 업데이트 데이터가 없습니다.');
    }

    const { gameData, playerData, gameResult } = data;

    if (!gameData || !playerData) {
      throw new Error('유효하지 않은 방 데이터입니다.');
    }

    updateRoomState(gameData, playerData);
    updateUIStatus();
    updateBoard();

    if (gameResult) {
      handleGameResult(gameResult);
    }
  } catch (error) {
    console.error('방 업데이트 처리 실패:', error);
  }
}

/**
 * 방 상태 업데이트
 */
function updateRoomState(gameData, playerData) {
  ROOM_STATE.gameData = gameData;
  ROOM_STATE.me = playerData.players.find((p) => p.nickname === nickname);
  ROOM_STATE.opponent = playerData.players.find((p) => p.nickname !== nickname);
}

/**
 * UI 상태 업데이트
 */
function updateUIStatus() {
  const { me, opponent, gameData } = ROOM_STATE;

  // 상대 상태 업데이트
  if (!opponent) {
    domElements.opponentName.textContent = '상대를 기다리는 중...';
    domElements.opponentReady.textContent = '';
    domElements.opponentReady.className = 'status-waiting';
  } else {
    domElements.opponentName.textContent = opponent.nickname;
    updateStatusIndicator(domElements.opponentReady, opponent.isReady);
  }

  // 버튼 상태 업데이트
  updateReadyButton(me?.isReady ?? false, gameData?.isPlaying ?? false);
}

/**
 * 상태 표시기 업데이트
 */
function updateStatusIndicator(element, isReady) {
  const indicator = element.previousElementSibling;
  if (!indicator) return;

  if (isReady) {
    indicator.className = 'status-indicator ready';
    element.className = 'status-ready';
    element.textContent = '준비 완료';
  } else {
    indicator.className = 'status-indicator waiting';
    element.className = 'status-waiting';
    element.textContent = '대기 중';
  }
}

/**
 * 준비 버튼 상태 업데이트
 */
function updateReadyButton(isReady, isPlaying) {
  if (isPlaying) {
    domElements.readyButton.textContent = '기권';
    domElements.readyButton.className = 'btn-danger';
    domElements.callDraw.classList.remove('hidden');
  } else {
    domElements.readyButton.textContent = isReady ? '준비 취소' : '준비하기';
    domElements.readyButton.className = 'btn-primary';
    domElements.callDraw.classList.add('hidden');
  }
}
/**
 * 게임 결과 처리
 */
function handleGameResult(gameResult) {
  alertResult(gameResult.winner, gameResult.reason);
}

/**
 * 소켓 연결 해제 핸들러
 */
function handleDisconnect() {
  console.warn('서버 연결이 해제되었습니다.');
  domElements.readyButton.disabled = true;
}

/**
 * 소켓 에러 핸들러
 */
function handleSocketError(error) {
  console.error('소켓 에러:', error);
}

/**
 * 치명적 에러 처리
 */
function handleFatalError(error) {
  console.error('치명적 에러:', error);
  alert(error.message || '오류가 발생했습니다.');
  redirectToLobby();
}

/**
 * 방 데이터 조회
 * @returns {{gameData: object|null, me: object|null, opponent: object|null}} 현재 방 상태
 */
function getRoomData() {
  return ROOM_STATE;
}

/**
 * 게임 결과 알림
 * @param {string|null} winner - 승자 닉네임 (무승부시 null)
 * @param {string} reason - 결과 사유
 */
function alertResult(winner, reason) {
  let message = '';
  if (winner === nickname) {
    message = `${reason}으로 승리했습니다.`;
  } else if (winner !== null) {
    message = `${reason}으로 패배했습니다.`;
  } else {
    message = `${reason}으로 무승부입니다.`;
  }
  alert(message);
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

export { socket, roomId, getRoomData };
