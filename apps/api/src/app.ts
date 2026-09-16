import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import cookieParser from 'cookie-parser';
import { loadEnv } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireSameOrigin } from './middleware/csrf.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { businessRouter } from './routes/business.js';
import { customerRouter } from './routes/customer.js';
import { invoiceRouter } from './routes/invoice.js';
import { analyticsRouter } from './routes/analytics.js';
import { paymentRouter } from './routes/payment.js';
import { paymentGatewayRouter } from './routes/payment-gateway.js';
import { publicRouter } from './routes/public.js';
import { createWebhookRouter } from './routes/webhook.js';
import { createSubscriptionRouter } from './routes/subscription.js';
import { notificationRouter } from './routes/notification.js';
import { adminRouter } from './routes/admin.js';

export function createApp(logger: Logger) {
  const env = loadEnv();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use('/api/webhooks/payment', express.raw({ type: '*/*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(
    requireSameOrigin([env.WEB_ORIGIN, env.API_ORIGIN, env.PUBLIC_API_ORIGIN].filter((origin): origin is string => Boolean(origin))),
  );
  app.use(
    createRateLimiter({
      windowMs: 10 * 60 * 1000,
      max: 240,
      keyPrefix: 'global',
      message: 'Too many requests. Please try again shortly.',
    }),
  );
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => ('requestId' in req && typeof req.requestId === 'string' ? req.requestId : 'unknown'),
    }),
  );

  app.use(healthRouter);
  app.use(authRouter);
  app.use(businessRouter);
  app.use(customerRouter);
  app.use(invoiceRouter);
  app.use(analyticsRouter);
  app.use(paymentRouter);
  app.use(paymentGatewayRouter);
  app.use(publicRouter);
  app.use(createWebhookRouter(logger));
  app.use(createSubscriptionRouter(logger));
app.use(notificationRouter);
  app.use(adminRouter);

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}
