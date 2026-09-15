import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  API_ORIGIN: z.string().url(),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_INTERCEPT_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  PUBLIC_API_ORIGIN: z.string().url().optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(16).optional(),
  RAZORPAY_API_BASE: z.string().url().optional(),
  SUBSCRIPTION_SANDBOX: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((value) => value !== 'false'),
  ADMIN_EMAILS: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;
