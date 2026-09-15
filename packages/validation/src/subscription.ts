import { z } from 'zod';

export const selectSubscriptionSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
  sandbox: z.boolean().optional().default(true),
});

export type SelectSubscriptionInput = z.infer<typeof selectSubscriptionSchema>;