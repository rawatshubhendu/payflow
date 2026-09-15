import type { NextFunction, Request, Response } from 'express';

export function requireSameOrigin(allowedOrigins: string[]): (req: Request, res: Response, next: NextFunction) => void {
  const allowed = new Set(allowedOrigins.map((origin) => origin.replace(/\/+$/, '')));
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (!origin) {
      next();
      return;
    }
    if (allowed.has(origin.replace(/\/+$/, ''))) {
      next();
      return;
    }
    res.status(403).json({
      data: null,
      error: { code: 'CROSS_ORIGIN_FORBIDDEN', message: 'Request origin is not permitted.' },
      meta: null,
    });
  };
}