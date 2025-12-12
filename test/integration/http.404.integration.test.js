import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

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

describe('HTTP 404 JSON', () => {
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

  it('returns 404 JSON for unknown path', async () => {
    const res = await fetch(baseUrl + '/unknown/path');
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(typeof data.message).toBe('string');
  });
});
