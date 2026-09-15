import crypto from 'node:crypto';
import type { CreateOrderParams, CreateOrderResult, PaymentProvider } from './provider.js';

export function verifyWebhookSignature(rawBody: Buffer, signature: string, webhookSecret: string): boolean {
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(provided, expectedBuffer);
}

export async function verifyRazorpayCredentials(keyId: string, keySecret: string, baseUrl?: string): Promise<{ valid: boolean; details?: string }> {
  try {
    const url = `${baseUrl ?? 'https://api.razorpay.com/v1'}/orders?count=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
    });
    if (response.ok) return { valid: true };
    if (response.status === 401 || response.status === 403) return { valid: false, details: 'API keys are invalid or unauthorized.' };
    const body = await response.text();
    return { valid: false, details: `Unexpected response ${response.status}: ${body.slice(0, 200)}` };
  } catch (error) {
    if (error instanceof Error) return { valid: false, details: `Unable to reach Razorpay: ${error.message}` };
    return { valid: false, details: 'Unable to reach Razorpay.' };
  }
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(config: { keyId: string; keySecret: string; webhookSecret?: string; baseUrl?: string }) {
    if (!config.keyId || !config.keySecret) {
      throw new Error('Razorpay is not configured: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
    }
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.razorpay.com/v1';
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes ?? {},
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Razorpay order creation failed: ${response.status} ${body}`);
    }

    const raw = (await response.json()) as Record<string, unknown>;
    return {
      gatewayOrderId: String(raw.id),
      raw,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.webhookSecret) return false;
    return verifyWebhookSignature(rawBody, signature, this.webhookSecret);
  }

  async verifyCredentials(): Promise<{ valid: boolean; details?: string }> {
    return verifyRazorpayCredentials(this.keyId, this.keySecret, this.baseUrl);
  }
}