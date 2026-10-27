import { spawn, type ChildProcess } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createMockShim } from './mock-shim.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const children: ChildProcess[] = [];
let shim: ReturnType<typeof createMockShim> | undefined;
let stopping = false;

async function portOpen(port: number) {
  return await new Promise<boolean>((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(200);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function start(command: string, args: string[]) {
  const child = spawn(command, args, {
    cwd: root, stdio: 'inherit', detached: process.platform !== 'win32',
    env: { ...process.env, TWURPLE_MOCK_API_PORT: '8081' },
  });
  children.push(child);
  child.once('error', (error) => {
    console.error(`[dev:mock] Could not start ${command}: ${error.message}`);
    void stop(1);
  });
  child.once('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[dev:mock] ${command} stopped (${signal ?? code}). Stopping the stack.`);
      void stop(code || 1);
    }
  });
  return child;
}

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid && child.exitCode === null) {
      try {
        if (process.platform === 'win32') child.kill('SIGTERM');
        else process.kill(-child.pid, 'SIGTERM');
      } catch { /* Child may already have exited. */ }
    }
  }
  await shim?.close();
  process.exitCode = code;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void stop(); });

try {
  for (const port of [8080, 8081, 3000, 5173]) {
    if (await portOpen(port)) throw new Error(`Port ${port} is already in use. Stop that process before dev:mock.`);
  }
  start('twitch', ['event', 'websocket', 'start-server', '--port', '8080']);
  const deadline = Date.now() + 10_000;
  while (!stopping && !(await portOpen(8080))) {
    if (Date.now() > deadline) throw new Error('Twitch CLI mock did not start within 10 seconds. Install Twitch CLI and check the log above.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!stopping) {
    shim = createMockShim();
    await new Promise<void>((resolve, reject) => {
      shim!.server.once('error', reject);
      shim!.server.listen(8081, '127.0.0.1', resolve);
    });
    console.log('[dev:mock] SIMULATED CHAT — shim ready at ws://127.0.0.1:8081/ws');
    start(process.execPath, ['--import', 'tsx', 'server/src/index.ts', '--mock']);
    start(process.execPath, ['node_modules/vite/bin/vite.js']);
  }
} catch (error) {
  console.error(`[dev:mock] ${error instanceof Error ? error.message : String(error)}`);
  await stop(1);
}
