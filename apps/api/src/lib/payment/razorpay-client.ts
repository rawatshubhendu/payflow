import type { PaymentProvider } from './provider.js';
import { RazorpayProvider } from './razorpay.js';
import { loadEnv } from '../../config/env.js';

export function getPaymentProvider(): PaymentProvider | null {
  const env = loadEnv();

  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    return new RazorpayProvider({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
      baseUrl: env.RAZORPAY_API_BASE,
    });
  }

  return null;
}