import { z } from 'zod';

export const verifyGatewayKeysSchema = z.object({
  keyId: z
    .string()
    .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, 'Key ID must look like rzp_test_... or rzp_live_...')
    .trim(),
  keySecret: z.string().min(1, 'Key Secret is required').max(200).trim(),
});

export type VerifyGatewayKeysInput = z.infer<typeof verifyGatewayKeysSchema>;

export const connectGatewaySchema = z.object({
  keyId: z
    .string()
    .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, 'Key ID must look like rzp_test_... or rzp_live_...')
    .trim(),
  keySecret: z.string().min(1, 'Key Secret is required').max(200).trim(),
  webhookSecret: z.string().min(16, 'Webhook Secret must be at least 16 characters').max(200).trim(),
});

export type ConnectGatewayInput = z.infer<typeof connectGatewaySchema>;