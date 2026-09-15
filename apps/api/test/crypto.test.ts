process.env.NODE_ENV = 'test';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.API_ORIGIN = 'http://localhost:4000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/payflow_test';
process.env.SESSION_SECRET = 'test-session-secret-min-16-chars';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret } from '../src/lib/crypto.js';

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a plaintext value', () => {
    const plaintext = 'rzp_test_abc123!@#xyz';
    const encrypted = encryptSecret(plaintext);
    assert.notEqual(encrypted, plaintext);
    assert.equal(decryptSecret(encrypted), plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-value';
    const a = encryptSecret(plaintext);
    const b = encryptSecret(plaintext);
    assert.notEqual(a, b);
    assert.equal(decryptSecret(a), plaintext);
    assert.equal(decryptSecret(b), plaintext);
  });

  it('rejects tampered payloads', () => {
    const encrypted = encryptSecret('hello');
    const parts = encrypted.split('.');
    parts[parts.length - 1] = Buffer.from('tampered').toString('base64');
    const tampered = parts.join('.');
    assert.throws(() => decryptSecret(tampered));
  });
});