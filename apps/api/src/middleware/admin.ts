import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from './auth.js';
import { sendApiError } from '../lib/http.js';
import { isAdminEmail } from '../lib/admin.js';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (!req.user || !isAdminEmail(req.user.email)) {
      sendApiError(res, 403, { code: 'ADMIN_ONLY', message: 'Admin access required.' });
      return;
    }
    next();
  });
}