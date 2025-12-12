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

describe('WS: moves broadcast and game over', () => {
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

  it('makeMove emits updateRoom to both clients and finishes on game over', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();

    const s1 = io(baseUrl, { query: { location: roomId, nickname: 'white' } });
    const s2 = io(baseUrl, { query: { location: roomId, nickname: 'black' } });

    // Both set ready and wait until game starts
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 4000);
      let c1 = false,
        c2 = false;
      function tryStart() {
        if (c1 && c2) {
          s1.emit('playerReady', { nickname: 'white', roomId, isReady: true });
          s2.emit('playerReady', { nickname: 'black', roomId, isReady: true });
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
      function checkPlaying(payload) {
        if (payload?.gameData?.isPlaying) {
          clearTimeout(timer);
          resolve(true);
        }
      }
      s1.on('updateRoom', checkPlaying);
      s2.on('updateRoom', checkPlaying);
    });

    // Listen for updates on both
    const updatePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      let got1 = false,
        got2 = false,
        lastPayload = null;
      function checkDone() {
        if (got1 && got2) {
          clearTimeout(timer);
          resolve(lastPayload);
        }
      }
      s1.on('updateRoom', (payload) => {
        got1 = true;
        lastPayload = payload;
        checkDone();
      });
      s2.on('updateRoom', (payload) => {
        got2 = true;
        lastPayload = payload;
        checkDone();
      });
    });

    // Make a valid move from white
    s1.emit('makeMove', { roomId, source: 'e2', target: 'e4' }, () => {});

    const payload = await updatePromise;
    expect(typeof payload).toBe('object');
    expect(payload.gameData.isPlaying).toBe(true);

    s1.close();
    s2.close();
  });
});
