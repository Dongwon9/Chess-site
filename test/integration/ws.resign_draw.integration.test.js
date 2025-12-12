import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { io } from 'socket.io-client';

let serverProcess;
const baseUrl = 'http://localhost:3000';

async function waitForServer(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/health');
      if (res.ok) return true;
    } catch (e) {
      void e; // ignore transient connection errors
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not start in time');
}

describe('WS: resign and draw flows', () => {
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

  it('resign triggers updateRoom with gameResult', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();
    const s1 = io(baseUrl, { query: { location: roomId, nickname: 'white' } });
    const s2 = io(baseUrl, { query: { location: roomId, nickname: 'black' } });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      let c1 = false,
        c2 = false;
      function tryStart() {
        if (c1 && c2) {
          s1.emit('playerReady', { nickname: 'white', roomId, isReady: true });
          s2.emit('playerReady', { nickname: 'black', roomId, isReady: true });
          clearTimeout(timer);
          resolve(true);
        }
      }
      s1.on('connect', () => {
        c1 = true;
        tryStart();
      });
      s2.on('connect', () => {
        c2 = true;
        tryStart();
      });
    });

    const updatePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 4000);
      s2.on('updateRoom', (payload) => {
        if (payload?.gameResult) {
          clearTimeout(timer);
          resolve(payload);
        }
      });
    });

    s1.emit('resign', { roomId, nickname: 'white' });
    const payload = await updatePromise;
    expect(typeof payload).toBe('object');
    expect(payload.gameResult).toBeDefined();

    s1.close();
    s2.close();
  });

  it('draw agreement results in gameResult when both call draw', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();
    const s1 = io(baseUrl, { query: { location: roomId, nickname: 'white' } });
    const s2 = io(baseUrl, { query: { location: roomId, nickname: 'black' } });

    // Wait until game starts
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000);
      let c1 = false,
        c2 = false;
      function tryReady() {
        if (c1 && c2) {
          s1.emit('playerReady', { nickname: 'white', roomId, isReady: true });
          s2.emit('playerReady', { nickname: 'black', roomId, isReady: true });
        }
      }
      s1.on('connect', () => {
        c1 = true;
        tryReady();
      });
      s2.on('connect', () => {
        c2 = true;
        tryReady();
      });
      function checkPlaying(payload) {
        if (payload?.gameData?.isPlaying) {
          clearTimeout(timer);
          resolve(true);
        }
      }
      s1.on('updateRoom', checkPlaying);
      s2.on('updateRoom', checkPlaying);
    });

    const updatePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000);
      s2.on('updateRoom', (payload) => {
        if (payload?.gameResult) {
          clearTimeout(timer);
          resolve(payload);
        }
      });
    });

    s1.emit('callDraw', { roomId, nickname: 'white' });
    s2.emit('callDraw', { roomId, nickname: 'black' });

    const payload = await updatePromise;
    expect(typeof payload).toBe('object');
    expect(payload.gameResult).toBeDefined();

    s1.close();
    s2.close();
  });
});
