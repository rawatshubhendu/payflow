import type { Response } from 'express';
import type { ZodError } from 'zod';
import type { ApiErrorBody } from '@payflow/types';

export function sendApiError(res: Response, status: number, error: ApiErrorBody): void {
  res.status(status).json({ data: null, error, meta: null });
}

export function sendValidationError(res: Response, error: ZodError, message: string): void {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'body';
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  sendApiError(res, 400, { code: 'VALIDATION_ERROR', message, fieldErrors });
}