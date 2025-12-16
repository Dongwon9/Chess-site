// public/js/room.test.js
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from '@jest/globals';

const selectors = [
  'myName',
  'opponentName',
  'opponentReady',
  'readyButton',
  'leave',
  'callDraw',
];

describe('room.js', () => {
  let updateBoardMock;
  let createDialogMock;
  let getNicknameMock;
  let socketMock;
  let handlers;

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    window.location.href = 'http://localhost/?id=test-room';
    global.alert = jest.fn();

    selectors.forEach((id) => {
      const el =
        id === 'opponentReady'
          ? (() => {
              const wrap = document.createElement('div');
              const indicator = document.createElement('span');
              indicator.className = 'status-indicator';
              wrap.appendChild(indicator);
              const readyEl = document.createElement('div');
              readyEl.id = id;
              wrap.appendChild(readyEl);
              document.body.appendChild(wrap);
              return readyEl;
            })()
          : (() => {
              const el = document.createElement('button');
              el.id = id;
              document.body.appendChild(el);
              return el;
            })();
      return el;
    });

    updateBoardMock = jest.fn();
    createDialogMock = jest.fn();
    getNicknameMock = jest.fn(() => 'Player1');

    jest.unstable_mockModule('./boardManager.js', () => ({
      updateBoard: updateBoardMock,
    }));
    jest.unstable_mockModule('./util.js', () => ({
      createDialog: createDialogMock,
    }));
    jest.unstable_mockModule('./getNickname.js', () => ({
      getNickname: getNicknameMock,
    }));

    handlers = {};
    socketMock = {
      emit: jest.fn(),
      on: jest.fn((event, cb) => {
        handlers[event] = cb;
      }),
      disconnect: jest.fn(),
    };
    global.io = jest.fn(() => socketMock);

    await import('./room.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with nickname and auto ready', () => {
    expect(getNicknameMock).toHaveBeenCalled();
    expect(document.getElementById('myName').textContent).toBe('Player1');
    expect(socketMock.emit).toHaveBeenCalledWith('playerReady', {
      nickname: 'Player1',
      roomId: 'test-room',
    });
  });

  it('emits playerReady when ready button clicked before game starts', () => {
    socketMock.emit.mockClear();
    document.getElementById('readyButton').dispatchEvent(new Event('click'));
    expect(socketMock.emit).toHaveBeenCalledWith('playerReady', {
      nickname: 'Player1',
      roomId: 'test-room',
    });
  });

  it('updates UI on room update and shows result alert', () => {
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
    handlers.updateRoom(payload);

    expect(updateBoardMock).toHaveBeenCalled();
    expect(document.getElementById('opponentName').textContent).toBe(
      'Opponent',
    );
    expect(document.getElementById('readyButton').textContent).toBe('기권');
    expect(global.alert).toHaveBeenCalledWith('Checkmate으로 승리했습니다.');
  });

  it('emits callDraw when callDraw button clicked', () => {
    document.getElementById('callDraw').dispatchEvent(new Event('click'));
    expect(socketMock.emit).toHaveBeenCalledWith('callDraw', {
      roomId: 'test-room',
      nickname: 'Player1',
    });
  });
});
```jest 테스트를 실행하려면 Jest 확장 설치를 사용하는 것이 좋습니다.```;
