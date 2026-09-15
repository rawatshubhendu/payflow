import { Router, type Request, type Response } from 'express';
import { connectGatewaySchema, verifyGatewayKeysSchema } from '@payflow/validation';
import type {
  ApiResponse,
  PaymentGatewayStatus,
  VerifyGatewayKeysResult,
  GatewayTestResult,
} from '@payflow/types';
import { PaymentGateway, type IPaymentGateway } from '../models/PaymentGateway.js';
import { encryptSecret } from '../lib/crypto.js';
import { RazorpayProvider } from '../lib/payment/razorpay.js';
import { buildProviderForGateway, gatewayModeFromKeyId, getBaseUrl } from '../lib/payment/gateway.js';
import { loadEnv } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { sendApiError, sendValidationError } from '../lib/http.js';

export const paymentGatewayRouter = Router();

function formatGatewayStatus(gateway: IPaymentGateway | null, webhookUrl: string | null): PaymentGatewayStatus {
  if (!gateway) {
    return { connected: false, provider: null, mode: null, keyId: null, connectedAt: null, webhookUrl };
  }
  return {
    connected: true,
    provider: gateway.provider as 'razorpay',
    mode: gateway.mode,
    keyId: gateway.keyId,
    connectedAt: gateway.connectedAt.toISOString(),
    webhookUrl,
  };
}

function resolveWebhookUrl(): string {
  const env = loadEnv();
  if (env.PUBLIC_API_ORIGIN) {
    return `${env.PUBLIC_API_ORIGIN.replace(/\/$/, '')}/api/webhooks/payment`;
  }
  return `${env.API_ORIGIN.replace(/\/$/, '')}/api/webhooks/payment`;
}

paymentGatewayRouter.get(
  '/api/payment-gateway',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentGatewayStatus>>) => {
    const gateway = await PaymentGateway.findOne({ businessId: req.business!._id });
    res.status(200).json({
      data: formatGatewayStatus(gateway, resolveWebhookUrl()),
      error: null,
      meta: null,
    });
  },
);

paymentGatewayRouter.post(
  '/api/payment-gateway/verify-keys',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<VerifyGatewayKeysResult>>) => {
    const parsed = verifyGatewayKeysSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error, 'Invalid Razorpay keys.');
      return;
    }

    const { keyId, keySecret } = parsed.data;
    const result = await new RazorpayProvider({ keyId, keySecret, baseUrl: getBaseUrl() }).verifyCredentials();

    if (result.valid) {
      res.status(200).json({ data: { valid: true }, error: null, meta: null });
      return;
    }

    res.status(200).json({
      data: { valid: false, details: result.details ?? 'These keys could not be verified.' },
      error: null,
      meta: null,
    });
  },
);

paymentGatewayRouter.post(
  '/api/payment-gateway',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentGatewayStatus>>) => {
    const parsed = connectGatewaySchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error, 'Invalid Razorpay connection details.');
      return;
    }

    const { keyId, keySecret, webhookSecret } = parsed.data;
    const gateway = await PaymentGateway.findOneAndUpdate(
      { businessId: req.business!._id },
      {
        $set: {
          provider: 'razorpay',
          mode: gatewayModeFromKeyId(keyId),
          keyId,
          keySecretEnc: encryptSecret(keySecret),
          webhookSecretEnc: encryptSecret(webhookSecret),
          connectedAt: new Date(),
        },
        $setOnInsert: { businessId: req.business!._id },
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      data: formatGatewayStatus(gateway, resolveWebhookUrl()),
      error: null,
      meta: null,
    });
  },
);

paymentGatewayRouter.post(
  '/api/payment-gateway/test',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<GatewayTestResult>>) => {
    const gateway = await PaymentGateway.findOne({ businessId: req.business!._id });
    if (!gateway) {
      sendApiError(res, 409, { code: 'GATEWAY_NOT_CONNECTED', message: 'Connect a payment gateway first.' });
      return;
    }

    const provider = buildProviderForGateway(gateway);
    const receipt = `payflow-test-${Date.now()}`;
    const result = await provider.createOrder({
      amountMinor: 100,
      currency: 'INR',
      receipt,
      notes: { purpose: 'payflow-connection-test' },
    });

    res.status(200).json({
      data: { orderId: result.gatewayOrderId, receipt, amount: 1, currency: 'INR' },
      error: null,
      meta: null,
    });
  },
);

paymentGatewayRouter.delete(
  '/api/payment-gateway',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentGatewayStatus>>) => {
    await PaymentGateway.deleteOne({ businessId: req.business!._id });
    res.status(200).json({
      data: formatGatewayStatus(null, resolveWebhookUrl()),
      error: null,
      meta: null,
    });
  },
);