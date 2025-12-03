import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

let serverProcess;
const baseUrl = 'http://localhost:3000';

async function waitForServer(timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/');
      if (res.ok || res.redirected) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not start in time');
}

describe('WebSocket Integration', () => {
  before(async () => {
    const { spawn } = await import('node:child_process');
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

  after(() => {
    if (serverProcess) serverProcess.kill('SIGTERM');
  });

  it('Client connects to lobby and receives updateLobby', async () => {
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

    assert.equal(received, true);
    socket.close();
  });

  it('Client joins room and playerReady callback returns room info', async () => {
    // Create a room first via HTTP
    const res = await fetch(baseUrl + '/lobby/create-room', { method: 'POST' });
    const { roomId } = await res.json();

    const socket = io(baseUrl, { query: { location: roomId, nickname: 'p1' } });

    const callbackResult = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 3000);
      socket.on('connect', () => {
        socket.emit('playerReady', { nickname: 'p1', roomId }, (roomInfo) => {
          clearTimeout(timer);
          resolve(roomInfo);
        });
      });
    });

    assert.equal(typeof callbackResult, 'object');
    assert.equal(Array.isArray(callbackResult.players), true);
    socket.close();
  });
});
