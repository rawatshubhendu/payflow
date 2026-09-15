import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { AppError, errorHandler, notFound } from '../src/middleware/errorHandler.js';

mongoose.set('bufferCommands', false);

function makeCtx() {
  let statusCode = 0;
  let jsonBody: unknown = null;
  const req = {
    method: 'POST',
    path: '/api/test',
    headers: { 'content-type': 'application/json' },
    requestId: 'req_test_1',
  } as unknown as Request;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {};
  const logger = { error: () => {} } as unknown as Logger;
  return { req, res, next, status: () => statusCode, body: () => jsonBody as { data: null; error: { code: string; message: string }; meta: null } };
}

describe('errorHandler', () => {
  it('maps an AppError to its status, code and human message without leaking stack', async () => {
    const ctx = makeCtx();
    const handler = errorHandler(ctx_logger());
    handler(new AppError(400, 'VALIDATION_ERROR', 'Invoice items are required.'), ctx.req, ctx.res, ctx.next);
    assert.equal(ctx.status(), 400);
    assert.equal(ctx.body().error.code, 'VALIDATION_ERROR');
    assert.equal(ctx.body().error.message, 'Invoice items are required.');
    assert.equal(ctx.body().data, null);
    assert.equal(ctx.body().meta, null);
  });

  it('maps an unknown error to a generic 500 INTERNAL_ERROR without leaking internals', async () => {
    const ctx = makeCtx();
    const handler = errorHandler(ctx_logger());
    const secret = `mongoose duplicate key rollback: ${JSON.stringify({ connectionString: 'mongodb://prod', key: 'supersecret' })}`;
    handler(new Error(secret), ctx.req, ctx.res, ctx.next);
    assert.equal(ctx.status(), 500);
    assert.equal(ctx.body().error.code, 'INTERNAL_ERROR');
    assert.equal(ctx.body().error.message, 'Something went wrong');
    assert.equal(JSON.stringify(ctx.body()).includes(secret), false);
  });

  it('handles non-Error throws (strings) as an opaque 500', async () => {
    const ctx = makeCtx();
    const handler = errorHandler(ctx_logger());
    handler('boom', ctx.req, ctx.res, ctx.next);
    assert.equal(ctx.status(), 500);
    assert.equal(ctx.body().error.code, 'INTERNAL_ERROR');
  });
});

describe('notFound', () => {
  it('forwards a 404 NOT_FOUND AppError for unknown routes', () => {
    const ctx = makeCtx();
    let forwarded: unknown = null;
    const next: NextFunction = (err?: unknown) => {
      forwarded = err;
    };
    notFound(ctx.req, ctx.res, next);
    assert.ok(forwarded instanceof AppError);
    assert.equal((forwarded as AppError).statusCode, 404);
    assert.equal((forwarded as AppError).code, 'NOT_FOUND');
  });
});

function ctx_logger(): Logger {
  return {
    error: () => {},
    warn: () => {},
    info: () => {},
  } as unknown as Logger;
}