/** @jest-environment jsdom */

import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from '@jest/globals';

describe('room.js (frontend DOM)', () => {
  let updateBoardMock;
  let createDialogMock;
  let getNicknameMock;
  let socketMock;
  let handlers;

  beforeEach(async () => {
    jest.resetModules();

    document.body.innerHTML = `
      <div>
        <span class="status-indicator"></span><div id="opponentReady"></div>
      </div>
      <div id="myName"></div>
      <div id="opponentName"></div>
      <button id="readyButton"></button>
      <button id="leave"></button>
      <button id="callDraw"></button>
    `;

    // URL에 방 id 쿼리 설정
    window.history.pushState({}, '', '/room.html?id=test-room');

    // 전역 alert 모킹
    global.alert = jest.fn();

    // 의존 모듈 모킹
    updateBoardMock = jest.fn();
    createDialogMock = jest.fn();
    getNicknameMock = jest.fn(() => 'Player1');

    await jest.unstable_mockModule('../../public/js/boardManager.js', () => ({
      updateBoard: updateBoardMock,
    }));
    await jest.unstable_mockModule('../../public/js/util.js', () => ({
      createDialog: createDialogMock,
    }));
    await jest.unstable_mockModule('../../public/js/getNickname.js', () => ({
      getNickname: getNicknameMock,
    }));

    // 소켓 모킹
    handlers = {};
    socketMock = {
      emit: jest.fn(),
      on: jest.fn((event, cb) => {
        handlers[event] = cb;
      }),
      disconnect: jest.fn(),
    };
    global.io = jest.fn(() => socketMock);

    // 모듈 로드 (initializeApp 실행)
    await import('../../public/js/room.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.io;
  });

  it('초기화 시 닉네임 표시와 자동 준비 emitting', () => {
    expect(getNicknameMock).toHaveBeenCalled();
    ``;
    expect(document.getElementById('myName').textContent).toBe('Player1');
    expect(socketMock.emit).toHaveBeenCalledWith('playerReady', {
      nickname: 'Player1',
      roomId: 'test-room',
    });
  });

  it('게임 시작 전 준비 버튼 클릭 시 playerReady emit', () => {
    socketMock.emit.mockClear();
    document.getElementById('readyButton').click();
    expect(socketMock.emit).toHaveBeenCalledWith('playerReady', {
      nickname: 'Player1',
      roomId: 'test-room',
    });
  });

  it('updateRoom 수신 시 UI/보드/결과 처리', () => {
    const payload = {
      gameData: { isPlaying: true },
      playerData: {
        players: [
          { nickname: 'Player1', isReady: true },
          { nickname: 'Opponent', isReady: false },
        ],
      },
      gameResult: { winner: 'Player1', reason: 'Checkmate' },
    };

    // 소켓으로부터 이벤트 수신 시뮬레이션
    handlers.updateRoom(payload);

    expect(updateBoardMock).toHaveBeenCalled();
    expect(document.getElementById('opponentName').textContent).toBe(
      'Opponent',
    );
    expect(document.getElementById('readyButton').textContent).toBe('기권');
    expect(global.alert).toHaveBeenCalledWith('Checkmate으로 승리했습니다.');
  });

  it('무승부 버튼 클릭 시 callDraw emit', () => {
    document.getElementById('callDraw').click();
    expect(socketMock.emit).toHaveBeenCalledWith('callDraw', {
      roomId: 'test-room',
      nickname: 'Player1',
    });
  });
});
