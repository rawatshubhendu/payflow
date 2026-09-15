import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { RazorpayProvider } from '../src/lib/payment/razorpay.js';

function testProvider(): RazorpayProvider {
  return new RazorpayProvider({
    keyId: 'rzp_test_key',
    keySecret: 'secret',
    webhookSecret: 'webhook-secret-1234567890',
  });
}

describe('RazorpayProvider.createOrder', () => {
  let server: http.Server;
  let baseUrl: string;
  let captured: { auth: string; body: unknown } | null = null;

  before(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk: Buffer) => {
        raw += chunk.toString();
      });
      req.on('end', () => {
        captured = {
          auth: String(req.headers.authorization ?? ''),
          body: JSON.parse(raw),
        };
        const body: { receipt?: string } = JSON.parse(raw);
        if (body.receipt === 'FAIL') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { description: 'Bad request' } }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'order_X1Y2Z3', amount: 118000, currency: 'INR' }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/v1`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('posts amount, currency, receipt and notes to /orders with basic auth', async () => {
    const provider = new RazorpayProvider({
      keyId: 'rzp_test_123',
      keySecret: 'rzp_secret_456',
      baseUrl,
    });

    const result = await provider.createOrder({
      amountMinor: 118000,
      currency: 'INR',
      receipt: 'INV-001',
      notes: { invoiceNumber: 'INV-001' },
    });

    assert.equal(result.gatewayOrderId, 'order_X1Y2Z3');
    assert.ok(captured);
    const expectedAuth = `Basic ${Buffer.from('rzp_test_123:rzp_secret_456').toString('base64')}`;
    assert.equal(captured.auth, expectedAuth);
    assert.deepEqual(captured.body, {
      amount: 118000,
      currency: 'INR',
      receipt: 'INV-001',
      notes: { invoiceNumber: 'INV-001' },
    });
  });

  it('throws a useful error when the gateway rejects the order', async () => {
    const provider = new RazorpayProvider({ keyId: 'k', keySecret: 's', baseUrl });
    await assert.rejects(
      () => provider.createOrder({ amountMinor: 118000, currency: 'INR', receipt: 'FAIL' }),
      /Razorpay order creation failed/,
    );
  });
});

describe('RazorpayProvider.verifyWebhookSignature', () => {
  const webhookSecret = 'webhook-secret-1234567890';
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_1' } }));

  it('accepts a valid HMAC-SHA256 signature', () => {
    const signature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    assert.equal(testProvider().verifyWebhookSignature(body, signature), true);
  });

  it('rejects a tampered body or wrong signature', () => {
    const signature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    const provider = testProvider();
    assert.equal(provider.verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature), false);
    assert.equal(provider.verifyWebhookSignature(body, 'deadbeef'), false);
  });

  it('rejects signatures when no webhook secret is configured', () => {
    const provider = new RazorpayProvider({ keyId: 'k', keySecret: 's' });
    assert.equal(provider.verifyWebhookSignature(body, 'anything'), false);
  });
});