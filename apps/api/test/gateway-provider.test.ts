process.env.NODE_ENV = 'test';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.API_ORIGIN = 'http://localhost:4000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/payflow_test';
process.env.SESSION_SECRET = 'test-session-secret-min-16-chars';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { encryptSecret } from '../src/lib/crypto.js';
import { buildProviderForGateway, gatewayModeFromKeyId } from '../src/lib/payment/gateway.js';
import { verifyWebhookSignature } from '../src/lib/payment/razorpay.js';

describe('buildProviderForGateway', () => {
  let server: http.Server;
  let baseUrl: string;
  let capturedAuth: string | null = null;

  before(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk: Buffer) => {
        raw += chunk.toString();
      });
      req.on('end', () => {
        capturedAuth = String(req.headers.authorization ?? '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'order_GW_TEST_123', amount: 500, currency: 'INR' }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/v1`;
    process.env.RAZORPAY_API_BASE = baseUrl;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('decrypts gateway secrets and uses them for order creation', async () => {
    const fakeGateway = {
      keyId: 'rzp_test_gateway_key',
      keySecretEnc: encryptSecret('super_secret_gateway_key_secret'),
      webhookSecretEnc: encryptSecret('webhook_secret_1234567890'),
    };

    const provider = buildProviderForGateway(fakeGateway as never);
    assert.equal(provider.keyId, 'rzp_test_gateway_key');

    const result = await provider.createOrder({
      amountMinor: 500,
      currency: 'INR',
      receipt: 'INV-GW-001',
      notes: { test: 'true' },
    });

    assert.equal(result.gatewayOrderId, 'order_GW_TEST_123');
    assert.equal(capturedAuth, `Basic ${Buffer.from('rzp_test_gateway_key:super_secret_gateway_key_secret').toString('base64')}`);
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'gw-webhook-secret-abcdef123456';
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured', entity: { id: 'pay_1', order_id: 'order_1' } }));

  it('accepts a valid signature', () => {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(verifyWebhookSignature(body, signature, secret), true);
  });

  it('rejects an invalid signature', () => {
    assert.equal(verifyWebhookSignature(body, 'deadbeef', secret), false);
  });

  it('rejects a signature generated with a different secret', () => {
    const signature = crypto.createHmac('sha256', 'wrong-secret-1234567890').update(body).digest('hex');
    assert.equal(verifyWebhookSignature(body, signature, secret), false);
  });
});

describe('gatewayModeFromKeyId', () => {
  it('returns live for rzp_live_ keys', () => {
    assert.equal(gatewayModeFromKeyId('rzp_live_abc'), 'live');
  });

  it('returns test otherwise', () => {
    assert.equal(gatewayModeFromKeyId('rzp_test_abc'), 'test');
    assert.equal(gatewayModeFromKeyId('invalid'), 'test');
  });
});