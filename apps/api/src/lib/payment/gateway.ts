import type { Types } from 'mongoose';
import type { PaymentProvider } from './provider.js';
import { RazorpayProvider } from './razorpay.js';
import { getPaymentProvider } from './razorpay-client.js';
import { decryptSecret } from '../crypto.js';
import { loadEnv } from '../../config/env.js';
import { PaymentGateway, type IPaymentGateway } from '../../models/PaymentGateway.js';
import { Payment } from '../../models/Payment.js';

export function getBaseUrl(): string | undefined {
  return loadEnv().RAZORPAY_API_BASE;
}

export function buildProviderForGateway(gateway: IPaymentGateway): PaymentProvider {
  return new RazorpayProvider({
    keyId: gateway.keyId,
    keySecret: decryptSecret(gateway.keySecretEnc),
    webhookSecret: decryptSecret(gateway.webhookSecretEnc),
    baseUrl: getBaseUrl(),
  });
}

export async function getPaymentProviderForBusiness(businessId: Types.ObjectId | string): Promise<PaymentProvider | null> {
  const gateway = await PaymentGateway.findOne({ businessId });
  if (gateway) {
    return buildProviderForGateway(gateway);
  }
  return getPaymentProvider();
}

export async function getWebhookSecretForOrder(orderId: string): Promise<{ secret: string | null; viaGateway: boolean }> {
  const payment = await Payment.findOne({ gatewayOrderId: orderId });
  if (payment) {
    const gateway = await PaymentGateway.findOne({ businessId: payment.businessId });
    if (gateway) {
      try {
        return { secret: decryptSecret(gateway.webhookSecretEnc), viaGateway: true };
      } catch {
        return { secret: null, viaGateway: true };
      }
    }
  }
  return { secret: loadEnv().RAZORPAY_WEBHOOK_SECRET ?? null, viaGateway: false };
}

export function gatewayModeFromKeyId(keyId: string): 'test' | 'live' {
  return keyId.startsWith('rzp_live_') ? 'live' : 'test';
}