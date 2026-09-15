import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { requireAuth } from '../src/middleware/auth.js';

process.env.SESSION_SECRET = 'test-secret-at-least-16-characters-long';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.API_ORIGIN = 'http://localhost:4000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/payflow_test';

describe('requireAuth Middleware Guard', () => {
  it('returns 401 UNAUTHORIZED when no token is present in cookies or headers', async () => {
    let statusCode = 0;
    let jsonBody: unknown = null;

    const req = {
      cookies: {},
      headers: {},
    } as unknown as Request;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        jsonBody = data;
        return this;
      },
    } as unknown as Response;

    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
    const body = jsonBody as { data: null; error: { code: string; message: string } };
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when token signature is invalid', async () => {
    let statusCode = 0;
    let jsonBody: unknown = null;

    const req = {
      cookies: { payflow_session: 'invalid.token.signature' },
      headers: {},
    } as unknown as Request;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        jsonBody = data;
        return this;
      },
    } as unknown as Response;

    let nextCalled = false;
    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
    const body = jsonBody as { data: null; error: { code: string; message: string } };
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});
