import crypto from 'node:crypto';
import type { Response } from 'express';
import { loadEnv } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'payflow_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSessionToken(userId: string): string {
  const env = loadEnv();
  const issuedAt = Date.now().toString();
  const payload = `${userId}.${issuedAt}`;
  const hmac = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string): string | null {
  const env = loadEnv();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [userId, issuedAtStr, signature] = parts;
  if (!userId || !issuedAtStr || !signature) {
    return null;
  }

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (Number.isNaN(issuedAt)) {
    return null;
  }

  // Session expired
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
    return null;
  }

  const payload = `${userId}.${issuedAtStr}`;
  const expectedHmac = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');

  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedHmac);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const env = loadEnv();
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  const env = loadEnv();
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
}
