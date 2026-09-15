import type { NextFunction, Request, Response } from 'express';

const stores = new Map<string, number[]>();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();

    let timestamps = stores.get(key) ?? [];
    timestamps = timestamps.filter((t) => now - t < options.windowMs);

    if (timestamps.length >= options.max) {
      res.status(429).json({
        data: null,
        error: {
          code: 'RATE_LIMITED',
          message: options.message ?? 'Too many requests. Please try again shortly.',
        },
        meta: null,
      });
      return;
    }

    timestamps.push(now);
    stores.set(key, timestamps);
    next();
  };
}