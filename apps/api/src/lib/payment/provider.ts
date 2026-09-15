export interface CreateOrderParams {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  keyId: string | null;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
}

export function toMinor(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}