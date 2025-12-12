import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { io } from 'socket.io-client';

let serverProcess;
const baseUrl = 'http://localhost:3000';

async function waitForServer(timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/');
      if (res.ok || res.redirected) return true;
    } catch (e) {
      void e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not start in time');
}

describe('웹소켓 통합 테스트', () => {
  beforeAll(async () => {
    const { spawn } = await import('child_process');
    serverProcess = spawn('node', ['./src/app.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
      },
      stdio: 'inherit',
    });
    await waitForServer(5000);
  });

  afterAll(() => {
    if (serverProcess) serverProcess.kill('SIGTERM');
  });

  it('클라이언트가 로비에 연결되고 updateLobby를 수신한다', async () => {
    const socket = io(baseUrl, {
      query: { location: 'lobby', nickname: 'tester' },
    });

    const received = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      socket.on('connect', async () => {
        // Trigger a lobby update via HTTP
        await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
      });
      socket.on('updateLobby', (rooms) => {
        clearTimeout(timer);
        resolve(Array.isArray(rooms));
      });
    });

    expect(received).toBe(true);
    socket.close();
  });

  it('클라이언트가 방에 입장하고 playerReady 콜백으로 방 정보를 받는다', async () => {
    // Create a room first via HTTP
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();

    const socket = io(baseUrl, {
      query: { location: roomId, nickname: 'p1' },
    });

    const callbackResult = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      socket.on('connect', () => {
        socket.emit(
          'playerReady',
          { nickname: 'p1', roomId, isReady: true },
          (response) => {
            clearTimeout(timer);
            resolve(response);
          },
        );
      });
    });

    expect(callbackResult.success).toBe(true);
    expect(callbackResult.isReady).toBe(true);
    expect(typeof callbackResult.roomInfo).toBe('object');
    expect(Array.isArray(callbackResult.roomInfo.playerData.players)).toBe(
      true,
    );
    socket.close();
  });

  it('준비 상태를 토글할 수 있다 (isReady 미제공 시)', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();

    const socket = io(baseUrl, {
      query: { location: roomId, nickname: 'p1' },
    });

    const results = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000);
      const states = [];

      socket.on('connect', () => {
        // First toggle (should set to true)
        socket.emit('playerReady', { nickname: 'p1', roomId }, (response) => {
          states.push(response.isReady);

          // Second toggle (should set to false)
          socket.emit(
            'playerReady',
            { nickname: 'p1', roomId },
            (response2) => {
              states.push(response2.isReady);
              clearTimeout(timer);
              resolve(states);
            },
          );
        });
      });
    });

    expect(results[0]).toBe(true);
    expect(results[1]).toBe(false);
    socket.close();
  });

  it('준비 상태 변경이 방의 모든 클라이언트에게 브로드캐스트된다', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();

    const socket1 = io(baseUrl, {
      query: { location: roomId, nickname: 'p1' },
    });
    const socket2 = io(baseUrl, {
      query: { location: roomId, nickname: 'p2' },
    });

    const updateReceived = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000);
      let socket1Connected = false;
      let socket2Connected = false;

      socket1.on('connect', () => {
        socket1Connected = true;
        checkBothConnected();
      });

      socket2.on('connect', () => {
        socket2Connected = true;
        checkBothConnected();
      });

      function checkBothConnected() {
        if (socket1Connected && socket2Connected) {
          // socket2 listens for updates
          socket2.on('updateRoom', (roomInfo) => {
            clearTimeout(timer);
            resolve(roomInfo);
          });

          // socket1 changes ready state
          setTimeout(() => {
            socket1.emit('playerReady', {
              nickname: 'p1',
              roomId,
              isReady: true,
            });
          }, 100);
        }
      }
    });

    expect(typeof updateReceived).toBe('object');
    const player1 = updateReceived.playerData.players.find(
      (p) => p.nickname === 'p1',
    );
    expect(player1.isReady).toBe(true);

    socket1.close();
    socket2.close();
  });

  it('존재하지 않는 방에 준비 요청 시 에러를 반환한다', async () => {
    const socket = io(baseUrl, {
      query: { location: 'nonexistent-room', nickname: 'p1' },
    });

    const errorResponse = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      socket.on('connect', () => {
        socket.emit(
          'playerReady',
          { nickname: 'p1', roomId: 'nonexistent-room-id', isReady: true },
          (response) => {
            clearTimeout(timer);
            resolve(response);
          },
        );
      });
    });

    expect(typeof errorResponse.error).toBe('string');
    socket.close();
  });
});
