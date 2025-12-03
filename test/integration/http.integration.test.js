import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

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

describe('HTTP Integration', () => {
  before(async () => {
    // Start app as a child process
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

  it('POST /lobby/create-room should create a room and return roomId', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.ok, true);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(typeof data.roomId === 'string');
  });
});
