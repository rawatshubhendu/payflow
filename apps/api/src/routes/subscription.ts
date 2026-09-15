import { Router, type Request, type Response } from 'express';
import { selectSubscriptionSchema } from '@payflow/validation';
import type { ApiResponse, SubscriptionInfo, SubscriptionSelectResult } from '@payflow/types';
import { buildSubscriptionInfo, getOrCreateSubscription, selectPlan } from '../lib/subscription.js';
import type { Logger } from 'pino';
import { requireAuth } from '../middleware/auth.js';
import { sendApiError, sendValidationError } from '../lib/http.js';
import { loadEnv } from '../config/env.js';

export function createSubscriptionRouter(logger: Logger): Router {
  const router = Router();

  router.get(
    '/api/subscription',
    requireAuth,
    async (req: Request, res: Response<ApiResponse<SubscriptionInfo>>) => {
      const businessId = req.business!._id;
      const subscription = await getOrCreateSubscription(businessId);

      res.status(200).json({
        data: await buildSubscriptionInfo(businessId, subscription),
        error: null,
        meta: null,
      });
    },
  );

  router.post(
    '/api/subscription/select',
    requireAuth,
    async (req: Request, res: Response<ApiResponse<SubscriptionSelectResult>>) => {
      const parsed = selectSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        sendValidationError(res, parsed.error, 'Invalid plan selection.');
        return;
      }

      const result = await selectPlan({
        businessId: req.business!._id,
        actorUserId: req.user!._id,
        plan: parsed.data.plan,
      });

      res.status(200).json({ data: result, error: null, meta: null });
    },
  );

  router.post('/api/subscription/webhook', (req: Request, res: Response) => {
    logger.info({ body: req.body }, 'subscription.webhook.received');
    res.status(200).json({ data: { received: true, action: 'ignored-sandbox' }, error: null, meta: null });
  });

  router.get('/api/subscription/webhook-url', requireAuth, (req: Request, res: Response) => {
    const base = loadEnv().PUBLIC_API_ORIGIN;
    if (!base) {
      sendApiError(res, 404, { code: 'WEBHOOK_URL_UNAVAILABLE', message: 'Webhook URL unavailable yet.' });
      return;
    }
    res.status(200).json({ data: { url: `${base}/api/subscription/webhook` }, error: null, meta: null });
  });

  return router;
}