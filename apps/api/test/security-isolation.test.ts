import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, accessSync, constants, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createConnection as tcpConnect, createServer as netCreateServer } from 'node:net';
import type { Server } from 'node:http';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: resolve(process.cwd(), '../../.env') });

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { connectDatabase, disconnectDatabase } from '../src/db/mongoose.js';
import { createSessionToken } from '../src/lib/session.js';
import { User } from '../src/models/User.js';
import { Business } from '../src/models/Business.js';
import { Payment } from '../src/models/Payment.js';

const MONGOD_PATHS = ['/opt/homebrew/bin/mongod', '/usr/local/bin/mongod', '/usr/bin/mongod'];

function findMongod(): string {
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
  throw new Error(
    'mongod binary not found. Install MongoDB Community (brew install mongodb-community) to run integration tests.',
  );
}

let mongodProc: ChildProcess | null = null;
let mongodDbPath = '';
let server: Server;
let baseUrl = '';
let tenantA: Awaited<ReturnType<typeof createTenant>>;
let tenantB: Awaited<ReturnType<typeof createTenant>>;
let tenantC: Awaited<ReturnType<typeof createTenant>>;
let customerAId = '';
let invoiceAId = '';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const logger = createLogger();

function waitForPort(port: number, timeoutMs = 20_000): Promise<void> {
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
        if (Date.now() > deadline) {
          reject(new Error('mongod did not start in time'));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };
    attempt();
  });
}

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = netCreateServer();
    probe.once('error', rejectPort);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        rejectPort(new Error('failed to allocate a free port'));
        return;
      }
      const port = address.port;
      probe.close(() => resolvePort(port));
    });
  });
}

async function startMongod() {
  const mongodPath = findMongod();
  mongodDbPath = mkdtempSync(join(tmpdir(), 'payflow-test-'));
  const port = await getFreePort();
  mongodProc = spawn(
    mongodPath,
    ['--dbpath', mongodDbPath, '--port', String(port), '--bind_ip', '127.0.0.1'],
    {
      stdio: 'ignore',
    },
  );
  await waitForPort(port);
  return `mongodb://127.0.0.1:${port}/payflow_test`;
}

async function createTenant(email: string, businessName: string) {
  const user = await User.create({
    email,
    passwordHash: 'unused-hash',
    emailVerifiedAt: new Date(),
    verificationCodeHash: null,
    verificationCodeExpiresAt: null,
    failedVerificationAttempts: 0,
  });
  const business = await Business.create({
    ownerId: user._id,
    name: businessName,
    currency: 'INR',
    invoicePrefix: 'INV-',
  });
  return { user, business, token: createSessionToken(user._id.toString()) };
}

async function api(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; origin?: string } = {},
): Promise<{
  status: number;
  json: { data?: unknown; error?: { code?: string; message?: string } } | null;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Connection: 'close',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.origin) headers.Origin = opts.origin;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: res.status, json };
}

before(async () => {
  const uri = await startMongod();

  await connectDatabase(uri, logger);
  const app = createApp(logger);
  await new Promise<void>((resolveListen) => {
    server = app.listen(0, () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind test server');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  tenantA = await createTenant('security.a@example.in', 'Tenant A');
  tenantB = await createTenant('security.b@example.in', 'Tenant B');
  tenantC = await createTenant('security.c@example.in', 'Tenant C');

  const customerRes = await api('POST', '/api/customers', {
    token: tenantA.token,
    body: { name: 'Acme Client', email: 'client@acme.com' },
  });
  assert.equal(customerRes.status, 201);
  customerAId = (customerRes.json?.data as { id: string }).id;

  const invoiceRes = await api('POST', '/api/invoices', {
    token: tenantA.token,
    body: {
      customerId: customerAId,
      items: [{ description: 'Design work', quantity: 1, unitPrice: 1000 }],
      taxRate: 18,
      taxType: 'IGST',
    },
  });
  assert.equal(invoiceRes.status, 201);
  invoiceAId = (invoiceRes.json?.data as { id: string }).id;
});

after(async () => {
  if (process.env.DEBUG_TEARDOWN) {
    try {
      writeFileSync('/tmp/pf-teardown.log', 'entered\n', { flag: 'a' });
    } catch (err) {
      console.error('writefail', err);
    }
  }
  if (server) {
    server.closeAllConnections();
    try {
      await withTimeout(new Promise<void>((resolve) => server.close(() => resolve())), 2000);
    } catch {
      // best-effort: force-close instead of hanging teardown
    }
  }
  if (process.env.DEBUG_TEARDOWN) console.error('[teardown] server closed');
  try {
    await disconnectDatabase();
  } catch {
    /* best-effort */
  }
  if (process.env.DEBUG_TEARDOWN) console.error('[teardown] db disconnected');
  if (mongodProc && mongodProc.exitCode === null) {
    mongodProc.kill();
    try {
      await withTimeout(
        new Promise<void>((killDone) => {
          mongodProc?.once('exit', () => killDone());
        }),
        2000,
      );
    } catch {
      // best-effort: kill is already sent; don't block teardown
    }
  }
  if (process.env.DEBUG_TEARDOWN) console.error('[teardown] mongod killed');
  if (mongodDbPath) {
    try {
      rmSync(mongodDbPath, { recursive: true, force: true });
    } catch {
      // cleanup best effort
    }
  }
});

test('invoice of tenant A is invisible to tenant B', async () => {
  const asB = await api('GET', `/api/invoices/${invoiceAId}`, { token: tenantB.token });
  assert.equal(asB.status, 404);
  assert.equal(asB.json?.error?.code, 'INVOICE_NOT_FOUND');

  const asA = await api('GET', `/api/invoices/${invoiceAId}`, { token: tenantA.token });
  assert.equal(asA.status, 200);
});

test('customer of tenant A never appears in tenant B list', async () => {
  const asB = await api('GET', '/api/customers', { token: tenantB.token });
  assert.equal(asB.status, 200);
  const customers = asB.json?.data as { id: string }[];
  assert.equal(
    customers.some((c) => c.id === customerAId),
    false,
  );
});

test('payment of tenant A is invisible to tenant B', async () => {
  const payment = await Payment.create({
    businessId: tenantA.business._id,
    invoiceId: invoiceAId,
    gateway: 'RAZORPAY',
    gatewayOrderId: 'order_sec_test_1',
    amount: 1180,
    currency: 'INR',
    status: 'CREATED',
  });

  const asB = await api('GET', `/api/payments/${payment._id.toString()}`, { token: tenantB.token });
  assert.equal(asB.status, 404);
  assert.equal(asB.json?.error?.code, 'PAYMENT_NOT_FOUND');

  const asA = await api('GET', `/api/payments/${payment._id.toString()}`, { token: tenantA.token });
  assert.equal(asA.status, 200);
});

test('admin endpoints reject a non-admin user', async () => {
  const res = await api('GET', '/api/admin/overview', { token: tenantA.token });
  assert.equal(res.status, 403);
  assert.equal(res.json?.error?.code, 'ADMIN_ONLY');
});

test('csrf: POST with an unapproved origin is rejected', async () => {
  const res = await api('POST', '/api/auth/forgot-password', {
    origin: 'https://evil.example',
    body: { email: 'nobody@example.in' },
  });
  assert.equal(res.status, 403);
  assert.equal(res.json?.error?.code, 'CROSS_ORIGIN_FORBIDDEN');
});

test('free plan enforces the 5-invoice limit', async () => {
  const customerRes = await api('POST', '/api/customers', {
    token: tenantC.token,
    body: { name: 'Tenant C Client' },
  });
  assert.equal(customerRes.status, 201);
  const customerId = (customerRes.json?.data as { id: string }).id;

  const createInvoice = () =>
    api('POST', '/api/invoices', {
      token: tenantC.token,
      body: {
        customerId,
        items: [{ description: 'Services', quantity: 1, unitPrice: 500 }],
      },
    });

  for (let index = 0; index < 5; index++) {
    const res = await createInvoice();
    assert.equal(res.status, 201, `invoice ${index + 1} should be created`);
  }

  const blocked = await createInvoice();
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json?.error?.code, 'PLAN_LIMIT_REACHED');
});

test('auth endpoints rate-limit repeated login attempts', async () => {
  const origin = process.env.WEB_ORIGIN ?? '';
  const body = { email: 'nobody@example.in', password: 'wrong-password' };

  for (let index = 0; index < 30; index++) {
    const res = await api('POST', '/api/auth/login', { origin, body });
    assert.equal(res.status, 401, `attempt ${index + 1} should be invalid credentials`);
  }

  const blocked = await api('POST', '/api/auth/login', { origin, body });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json?.error?.code, 'RATE_LIMITED');
});
