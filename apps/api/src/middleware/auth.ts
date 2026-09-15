import type { Request, Response, NextFunction } from 'express';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../lib/session.js';
import { User } from '../models/User.js';
import { ensureBusiness } from '../lib/business.js';
import type { ApiResponse } from '@payflow/types';

export async function requireAuth(req: Request, res: Response<ApiResponse<never>>, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const token = cookieToken || bearerToken;

  if (!token) {
    res.status(401).json({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
      meta: null,
    });
    return;
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session invalid or expired. Please log in again.',
      },
      meta: null,
    });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found.',
        },
        meta: null,
      });
      return;
    }

    const business = await ensureBusiness(user._id, user.email);

    req.user = user;
    req.business = business;
    next();
  } catch (err) {
    next(err);
  }
}
