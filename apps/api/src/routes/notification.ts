import { Router, type Request, type Response } from 'express';
import type { ApiResponse, NotificationListResult } from '@payflow/types';
import { requireAuth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { sendApiError } from '../lib/http.js';

export const notificationRouter = Router();

notificationRouter.get('/api/notifications', requireAuth, async (req: Request, res: Response<ApiResponse<NotificationListResult>>) => {
  const businessId = req.business!._id;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ businessId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ businessId, read: false }),
  ]);

  res.status(200).json({
    data: {
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        invoiceId: notification.invoiceId ? notification.invoiceId.toString() : null,
        invoiceNumber: notification.invoiceNumber ?? null,
        amount: notification.amount ?? null,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      })),
      unreadCount,
    },
    error: null,
    meta: null,
  });
});

notificationRouter.post('/api/notifications/read', requireAuth, async (req: Request, res: Response<ApiResponse<{ unreadCount: number }>>) => {
  const businessId = req.business!._id;
  const ids: unknown = req.body?.ids;

  if (ids !== undefined && (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string'))) {
    sendApiError(res, 400, { code: 'VALIDATION_ERROR', message: 'ids must be an array of notification ids.' });
    return;
  }

  const filter =
    Array.isArray(ids) && ids.length > 0
      ? { businessId, _id: { $in: ids } }
      : { businessId, read: false };

  const now = new Date();
  await Notification.updateMany(filter, { $set: { read: true, readAt: now } });

  const unreadCount = await Notification.countDocuments({ businessId, read: false });

  res.status(200).json({ data: { unreadCount }, error: null, meta: null });
});