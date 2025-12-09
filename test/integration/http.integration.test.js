import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

let serverProcess;
const baseUrl = 'http://localhost:3000';

async function waitForServer(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/health');
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not start in time');
}

describe('HTTP 통합 테스트', () => {
  beforeAll(async () => {
    // Start app as a child process
    const { spawn } = await import('child_process');
    serverProcess = spawn('node', ['./src/app.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
      },
      stdio: 'pipe',
    });
    await waitForServer(5000);
  });

  afterAll(() => {
    if (serverProcess) serverProcess.kill('SIGTERM');
  });

  it('POST /lobby/create-room 은 방을 생성하고 roomId를 반환해야 한다', async () => {
    const res = await fetch(baseUrl + '/lobby/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.roomId).toBe('string');
  });

  it('GET /lobby/rooms 는 참여 가능한 방 목록을 반환해야 한다', async () => {
    const res = await fetch(baseUrl + '/lobby/rooms');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.rooms)).toBe(true);
  });

  it('GET /health 는 서버 상태를 반환해야 한다', async () => {
    const res = await fetch(baseUrl + '/health');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});
