import { Router } from 'express';
import type { ApiSuccess, HealthStatus } from '@payflow/types';
import { isDatabaseConnected } from '../db/mongoose.js';

export const healthRouter = Router();

healthRouter.get('/api/health', (_req, res) => {
  const database = isDatabaseConnected() ? 'connected' : 'disconnected';
  const payload: ApiSuccess<HealthStatus> = {
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'payflow-api',
      timestamp: new Date().toISOString(),
      database,
    },
    error: null,
    meta: null,
  };

  res.status(database === 'connected' ? 200 : 503).json(payload);
});
