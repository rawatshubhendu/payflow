import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../src/lib/session.js';

// Ensure SESSION_SECRET is set for tests
process.env.SESSION_SECRET = 'test-secret-at-least-16-characters-long';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.API_ORIGIN = 'http://localhost:4000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/payflow_test';

describe('Session Management', () => {
  it('creates and successfully verifies a valid session token', () => {
    const userId = 'user_64f123456789abcdef012345';
    const token = createSessionToken(userId);

    assert.ok(token, 'Token should not be empty');
    assert.equal(token.split('.').length, 3, 'Token should contain 3 dot-separated parts');

    const verifiedUserId = verifySessionToken(token);
    assert.equal(verifiedUserId, userId, 'Verified userId should match original userId');
  });

  it('rejects tampered session tokens', () => {
    const userId = 'user_64f123456789abcdef012345';
    const token = createSessionToken(userId);

    const parts = token.split('.');
    // Tamper with user id
    const tamperedToken = `tampered_user.${parts[1]}.${parts[2]}`;

    const verified = verifySessionToken(tamperedToken);
    assert.equal(verified, null, 'Tampered token must be rejected');
  });

  it('rejects malformed tokens', () => {
    assert.equal(verifySessionToken(''), null);
    assert.equal(verifySessionToken('invalid-token'), null);
    assert.equal(verifySessionToken('part1.part2'), null);
    assert.equal(verifySessionToken('a.b.c.d'), null);
  });
});
