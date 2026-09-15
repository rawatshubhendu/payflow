import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, rmSync, accessSync, constants, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createConnection as tcpConnect, createServer as netCreateServer } from 'node:net';
import type { Server } from 'node:http';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: resolve(process.cwd(), '../../.env') });
process.env.EMAIL_INTERCEPT_URL = 'http://127.0.0.1:1';

import pino from 'pino';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/db/mongoose.js';
import { createSessionToken } from '../src/lib/session.js';
import { encryptSecret } from '../src/lib/crypto.js';
import { User } from '../src/models/User.js';
import { Business } from '../src/models/Business.js';
import { Payment } from '../src/models/Payment.js';
import { PaymentGateway } from '../src/models/PaymentGateway.js';
import { Invoice } from '../src/models/Invoice.js';

const GATEWAY_WEBHOOK_SECRET = 'whsec_gateway_1234567890';
const ENV_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

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
  throw new Error('mongod binary not found. Install MongoDB Community to run integration tests.');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function signWebhook(rawBody: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function paymentCapturedEvent(paymentId: string, orderId: string, amountMinor = 118000) {
  return {
    entity: 'event',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: amountMinor,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          method: 'card',
        },
      },
    },
  };
}

function paymentFailedEvent(paymentId: string, orderId: string) {
  return {
    entity: 'event',
    event: 'payment.failed',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: 118000,
          currency: 'INR',
          status: 'failed',
          order_id: orderId,
        },
      },
    },
  };
}

let mongodProc: ChildProcess | null = null;
let mongodDbPath = '';
let server: Server;
let baseUrl = '';
let legacyTenant: Awaited<ReturnType<typeof createTenant>>;
let gatewayTenant: Awaited<ReturnType<typeof createTenant>>;

const logger = pino({ level: 'silent' });

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

async function createTenant(email: string) {
  const user = await User.create({
    email,
    passwordHash: 'unused-hash',
    emailVerifiedAt: new Date(),
  });
  const business = await Business.create({
    ownerId: user._id,
    name: `Business of ${email}`,
    currency: 'INR',
    invoicePrefix: 'INV-',
  });
  return { user, business, token: createSessionToken(user._id.toString()) };
}

async function postWebhook(rawBody: Buffer, signature?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Connection: 'close',
  };
  if (signature) headers['x-razorpay-signature'] = signature;
  const res = await fetch(`${baseUrl}/api/webhooks/payment`, {
    method: 'POST',
    headers,
    body: rawBody,
  });
  const text = await res.text();
  return {
    status: res.status,
    json: text
      ? (JSON.parse(text) as {
          data?: { success?: boolean; duplicate?: boolean; reason?: string };
          error?: { code?: string; message?: string };
        })
      : null,
  };
}

let customerGid = 0;
async function createInvoiceAndPayment(
  tenant: Awaited<ReturnType<typeof createTenant>>,
): Promise<{ invoiceId: string; orderId: string }> {
  const suffix = `${Date.now()}_${(customerGid += 1)}`;
  const orderId = `order_wh_${suffix}`;

  const customerRes = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tenant.token}` },
    body: JSON.stringify({ name: 'Acme Client', email: `client.${suffix}@acme.com` }),
  });
  const customerText = await customerRes.text();
  assert.equal(customerRes.status, 201, customerText);
  const customerData = JSON.parse(customerText) as { data: { id: string } };

  const invoice = await Invoice.create({
    businessId: tenant.business._id,
    customerId: customerData.data.id,
    invoiceNumber: `INV-${suffix}`,
    items: [{ description: 'Design work', quantity: 1, unitPrice: 1000, lineTotal: 1000 }],
    subtotal: 1000,
    discountAmount: 0,
    taxableAmount: 1000,
    taxRate: 18,
    taxType: 'IGST',
    taxAmount: 180,
    totalAmount: 1180,
    currency: 'INR',
    status: 'DRAFT',
    publicToken: `pt_${suffix}`,
  });

  await Payment.create({
    businessId: tenant.business._id,
    invoiceId: invoice._id,
    gateway: 'RAZORPAY',
    gatewayOrderId: orderId,
    amount: 1180,
    currency: 'INR',
    status: 'CREATED',
  });

  return { invoiceId: invoice._id.toString(), orderId };
}

async function getPaidStatus(orderId: string) {
  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (!payment) return null;
  const invoice = await Invoice.findById(payment.invoiceId).select('status paidAt').lean();
  return {
    paymentStatus: payment.status,
    paymentId: payment.gatewayPaymentId,
    invoiceStatus: invoice?.status,
  };
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

  legacyTenant = await createTenant(`legacy.${Date.now()}@example.in`);
  gatewayTenant = await createTenant(`gateway.${Date.now()}@example.in`);

  await PaymentGateway.create({
    businessId: gatewayTenant.business._id,
    provider: 'razorpay',
    mode: 'test',
    keyId: 'rzp_test_gateway_key',
    keySecretEnc: encryptSecret('key_secret_1'),
    webhookSecretEnc: encryptSecret(GATEWAY_WEBHOOK_SECRET),
  });
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
      await withTimeout(
        new Promise<void>((resolveClose) => server.close(() => resolveClose())),
        2000,
      );
    } catch {
      // best-effort
    }
  }
  try {
    await disconnectDatabase();
  } catch {
    // best-effort
  }
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
      // best-effort
    }
  }
  if (mongodDbPath) {
    try {
      rmSync(mongodDbPath, { recursive: true, force: true });
    } catch {
      // cleanup best effort
    }
  }
});

let gatewayOrderId: string;
let failOrderId: string;
let legacyOrderId: string;

beforeEach(async () => {
  const gatewayInvoice = await createInvoiceAndPayment(gatewayTenant);
  gatewayOrderId = gatewayInvoice.orderId;
  const failInvoice = await createInvoiceAndPayment(gatewayTenant);
  failOrderId = failInvoice.orderId;
  const legacyInvoice = await createInvoiceAndPayment(legacyTenant);
  legacyOrderId = legacyInvoice.orderId;
});

test('rejects a webhook with no signature', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_no_sig', gatewayOrderId)));
  const res = await postWebhook(raw);
  assert.equal(res.status, 401);
  assert.equal(res.json?.error?.code, 'INVALID_SIGNATURE');
});

test('rejects a webhook signed with the wrong secret', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_bad_sig', gatewayOrderId)));
  const res = await postWebhook(raw, signWebhook(raw, 'wrong-secret'));
  assert.equal(res.status, 401);
  assert.equal(res.json?.error?.code, 'INVALID_SIGNATURE');
});

test('legacy tenant falls back to the platform webhook secret', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_legacy_1', legacyOrderId)));
  const res = await postWebhook(raw, signWebhook(raw, ENV_WEBHOOK_SECRET));
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json?.data?.success, true);
});

test('a tenant-level gateway secret is required, not the platform secret', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_gw_env', gatewayOrderId)));
  const res = await postWebhook(raw, signWebhook(raw, ENV_WEBHOOK_SECRET));
  assert.equal(res.status, 401);
  assert.equal(res.json?.error?.code, 'INVALID_SIGNATURE');
});

test('captures a payment signed with the tenant gateway secret and marks the invoice PAID', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_capture_1', gatewayOrderId)));
  const res = await postWebhook(raw, signWebhook(raw, GATEWAY_WEBHOOK_SECRET));
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json?.data?.success, true);

  const state = await getPaidStatus(gatewayOrderId);
  assert.equal(state?.paymentStatus, 'CAPTURED');
  assert.equal(state?.paymentId, 'pay_capture_1');
  assert.equal(state?.invoiceStatus, 'PAID');
});

test('replays a duplicate captured event and stays idempotent', async () => {
  const raw = Buffer.from(JSON.stringify(paymentCapturedEvent('pay_dup_1', gatewayOrderId)));
  const sig = signWebhook(raw, GATEWAY_WEBHOOK_SECRET);

  const first = await postWebhook(raw, sig);
  assert.equal(first.status, 200);
  assert.equal(first.json?.data?.success, true);
  assert.notEqual(first.json?.data?.duplicate, true);

  const second = await postWebhook(raw, sig);
  assert.equal(second.status, 200);
  assert.equal(second.json?.data?.duplicate, true);

  const paid = await getPaidStatus(gatewayOrderId);
  assert.equal(paid?.paymentStatus, 'CAPTURED');
  assert.equal(paid?.paymentId, 'pay_dup_1');
  assert.equal(paid?.invoiceStatus, 'PAID');
});

test('rejects a captured event whose amount differs from the order', async () => {
  const raw = Buffer.from(
    JSON.stringify(paymentCapturedEvent('pay_mismatch', gatewayOrderId, 99999)),
  );
  const res = await postWebhook(raw, signWebhook(raw, GATEWAY_WEBHOOK_SECRET));
  assert.equal(res.status, 400);
  assert.equal(res.json?.error?.code, 'PAYMENT_MISMATCH');
  const payment = await Payment.findOne({ gatewayOrderId });
  assert.equal(payment?.status, 'CREATED');
});

test('rejects malformed JSON webhook body', async () => {
  const raw = Buffer.from('this is not json{{{{');
  const res = await postWebhook(raw, signWebhook(raw, GATEWAY_WEBHOOK_SECRET));
  assert.equal(res.status, 400);
  assert.equal(res.json?.error?.code, 'INVALID_WEBHOOK');
});

test('handles payment.failed events and marks the payment FAILED', async () => {
  const raw = Buffer.from(JSON.stringify(paymentFailedEvent('pay_fail_1', failOrderId)));
  const res = await postWebhook(raw, signWebhook(raw, GATEWAY_WEBHOOK_SECRET));
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json?.data?.success, true);

  const payment = await Payment.findOne({ gatewayOrderId: failOrderId });
  assert.equal(payment?.status, 'FAILED');
  assert.equal(payment?.gatewayPaymentId, 'pay_fail_1');
});
