import { Router, type Request, type Response } from 'express';
import { updateBusinessSchema } from '@payflow/validation';
import type { ApiResponse, BusinessSummary } from '@payflow/types';
import { Business } from '../models/Business.js';
import { formatBusiness } from '../lib/serializers.js';
import { assertPaidPlan } from '../lib/subscription.js';
import { requireAuth } from '../middleware/auth.js';

export const businessRouter = Router();

businessRouter.get('/api/business', requireAuth, (req: Request, res: Response<ApiResponse<BusinessSummary>>) => {
  res.status(200).json({
    data: formatBusiness(req.business!),
    error: null,
    meta: null,
  });
});

businessRouter.patch('/api/business', requireAuth, async (req: Request, res: Response<ApiResponse<BusinessSummary>>) => {
  const parsed = updateBusinessSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'body';
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid business profile details.',
        fieldErrors,
      },
      meta: null,
    });
    return;
  }

  if (parsed.data.logoUrl !== undefined) {
    await assertPaidPlan(req.business!._id, 'Custom branding');
  }

  const updated = await Business.findByIdAndUpdate(req.business!._id, { $set: parsed.data }, { new: true });
  if (!updated) {
    res.status(404).json({
      data: null,
      error: {
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business not found.',
      },
      meta: null,
    });
    return;
  }

  res.status(200).json({
    data: formatBusiness(updated),
    error: null,
    meta: null,
  });
});
