import type { NextFunction, Request, Response } from 'express';
import type { ApiFailure } from '@payflow/types';
import type { Logger } from 'pino';
import { AppErrorLog } from '../models/AppErrorLog.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function persistError(req: Request, err: { statusCode: number; code: string; message: string }, detail?: string): void {
  const businessId = 'business' in req && req.business?._id;
  AppErrorLog.create({
    businessId,
    requestId: typeof req.requestId === 'string' ? req.requestId : undefined,
    method: req.method,
    path: req.path,
    status: err.statusCode,
    code: err.code,
    message: err.message,
    detail,
  }).catch(() => undefined);
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

export function errorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const status = isAppError ? err.statusCode : 500;
    const code = isAppError ? err.code : 'INTERNAL_ERROR';
    const message = isAppError ? err.message : 'Something went wrong';

    logger.error(
      {
        err,
        requestId: req.requestId,
        path: req.path,
        method: req.method,
      },
      message,
    );

    if (status >= 500 || isAppError) {
      persistError(req, { statusCode: status, code, message }, err instanceof Error ? err.stack : undefined);
    }

    const body: ApiFailure = {
      data: null,
      error: { code, message },
      meta: null,
    };

    res.status(status).json(body);
  };
}
