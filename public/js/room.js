import { updateBoard } from './boardManager.js';
import { getNickname } from './getNickname.js';
import { io } from 'https://esm.sh/socket.io-client';

const DOM_SELECTORS = {
  opponentName: '#opponentName',
  opponentReady: '#opponentReady',
  meReady: '#meReady',
  readyButton: '#readyButton',
  myName: '#myName',
};

const ROOM_STATE = {
  gameData: null,
  me: null,
  opponent: null,
};

let socket = null;
let roomId = null;
let nickname = null;
let domElements = {};

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
    meReady: document.getElementById(DOM_SELECTORS.meReady.slice(1)),
    readyButton: document.getElementById(DOM_SELECTORS.readyButton.slice(1)),
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
  } catch (error) {
    handleFatalError(new Error(`소켓 초기화 실패: ${error.message}`));
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  domElements.readyButton.addEventListener('click', handleReadyButtonClick);
}

/**
 * 이벤트 리스너 정리 (메모리 누수 방지)
 */
function cleanupEventListeners() {
  if (domElements.readyButton) {
    domElements.readyButton.removeEventListener(
      'click',
      handleReadyButtonClick,
    );
  }
}

/**
 * 준비 버튼 클릭 핸들러
 */
function handleReadyButtonClick() {
  if (!socket) return;
  try {
    socket.emit('togglePlayerReady', { nickname, roomId });
  } catch (error) {
    console.error('준비 상태 전송 실패:', error);
  }
}

/**
 * 자동 준비 (입장 시)
 */
function autoReadyOnJoin() {
  if (socket) {
    socket.emit('togglePlayerReady', { nickname, roomId });
  }
}

/**
 * 방 정보 업데이트 핸들러
 */
function handleRoomUpdate(data) {
  try {
    const { gameData, playerData, gameResult } = data;

    if (!gameData || !playerData) {
      throw new Error('유효하지 않은 방 데이터');
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

  // 내 상태 업데이트
  updateStatusIndicator(domElements.meReady, me?.isReady ?? false);

  // 상대 상태 업데이트
  if (!opponent) {
    domElements.opponentName.textContent = '상대를 기다리는 중...';
    domElements.opponentReady.textContent = '대기 중...';
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
    domElements.readyButton.textContent = '게임 진행 중...';
    domElements.readyButton.disabled = true;
  } else {
    domElements.readyButton.textContent = isReady ? '준비 취소' : '준비하기';
    domElements.readyButton.disabled = false;
  }
}

/**
 * 게임 결과 처리
 */
function handleGameResult(gameResult) {
  const { winner, reason } = gameResult;
  const message = `게임 종료: ${winner} (${reason})`;
  console.log(message);
  // TODO: 모달 또는 알림으로 사용자에게 표시
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
  window.location.href = '/lobby.html';
}

/**
 * 방 데이터 조회
 */
function getRoomData() {
  return ROOM_STATE;
}

/**
 * 페이지 언로드 시 리소스 정리
 */
window.addEventListener('beforeunload', () => {
  cleanupEventListeners();
  if (socket) {
    socket.disconnect();
  }
});

// 앱 초기화
initializeApp();

export { socket, roomId, getRoomData };
