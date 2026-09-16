#!/usr/bin/env node
/**
 * E2E backend orchestrator.
 *
 * Spawns a disposable MongoDB, an email catcher, and the PayFlow API so that
 * Playwright can run E2E specs against a fully local stack. Keeps running until
 * killed (Playwright sends SIGTERM when the suite finishes), then cleans up.
 *
 * Env contract (inherited from the shell):
 *  - loads repo-root `.env` so the API gets the same
 *    SESSION_SECRET / RAZORPAY_* / etc. that the web build used.
 *  - MONGODB_URI, PORT and EMAIL_INTERCEPT_URL are always overridden.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, accessSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection as tcpConnect, createServer as netCreateServer } from 'node:net';
import http from 'node:http';
import { config as loadDotenv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const API_DIR = join(REPO_ROOT, 'apps/api');

const API_PORT = 4001;
const CATCHER_PORT = 8099;
const MONGOD_PATHS = ['/opt/homebrew/bin/mongod', '/usr/local/bin/mongod', '/usr/bin/mongod'];

const ENV_FILE = join(REPO_ROOT, '.env');

function findMongod() {
  for (const candidate of MONGOD_PATHS) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // try next path
    }
  }
  for (const dir of String(process.env.PATH ?? '').split(':')) {
    const candidate = join(dir, 'mongod');
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // try next PATH dir
    }
  }
  throw new Error('mongod binary not found. Install MongoDB Community to run E2E tests.');
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = netCreateServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolvePort(port));
    });
  });
}

function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolveReady, reject) => {
    const attempt = () => {
      const socket = tcpConnect({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolveReady();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} did not open in time`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

const loaded = loadDotenv({ path: ENV_FILE, quiet: true }).parsed ?? {};
const loadedEnv = { ...process.env, ...loaded };

const children = [];
let dbPath = '';

function cleanup() {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
  if (dbPath) {
    try {
      rmSync(dbPath, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

function shutdown(signal) {
  console.log(`[e2e] ${signal}: shutting down mongod/api`);
  cleanup();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const mongodBin = findMongod();
const mongoPort = await getFreePort();
dbPath = mkdtempSync(join(tmpdir(), 'payflow-e2e-mongo-'));

const mongod = spawn(
  mongodBin,
  ['--dbpath', dbPath, '--port', String(mongoPort), '--bind_ip', '127.0.0.1', '--quiet'],
  { stdio: 'ignore' },
);
children.push(mongod);
await waitForPort(mongoPort);

console.log(`[e2e] mongod up on ${mongoPort}`);

// ---- Email catcher ---------------------------------------------------------
const emails = [];
const catcher = http.createServer((req, res) => {
  const body = (chunks) => {
    let acc = '';
    for (const c of chunks) acc += c;
    return acc;
  };
  if (req.method === 'POST' && req.url === '/emails') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body(chunks));
        emails.push({ ...parsed, capturedAt: new Date().toISOString() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: `cat-${emails.length}` }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid body' }));
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/api/messages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(emails));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise((resolveReady) => catcher.listen(CATCHER_PORT, '127.0.0.1', resolveReady));
console.log(`[e2e] email catcher up on ${CATCHER_PORT}`);

// ---- API -------------------------------------------------------------------
const apiEnv = {
  ...loadedEnv,
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  WEB_ORIGIN: 'http://localhost:3001',
  API_ORIGIN: `http://localhost:${API_PORT}`,
  PUBLIC_API_ORIGIN: `http://localhost:${API_PORT}`,
  MONGODB_URI: `mongodb://127.0.0.1:${mongoPort}/payflow_e2e`,
  EMAIL_INTERCEPT_URL: `http://127.0.0.1:${CATCHER_PORT}`,
};

const api = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  cwd: API_DIR,
  env: apiEnv,
  stdio: ['ignore', 'inherit', 'inherit'],
});
children.push(api);

console.log(`[e2e] api starting on :${API_PORT}`);
