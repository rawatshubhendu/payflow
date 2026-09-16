import { Router, type Request, type Response } from 'express';
import type { Logger } from 'pino';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Business } from '../models/Business.js';
import { User } from '../models/User.js';
import { getWebhookSecretForOrder } from '../lib/payment/gateway.js';
import { verifyWebhookSignature } from '../lib/payment/razorpay.js';
import { toMinor } from '../lib/payment/provider.js';
import { writeAuditLog } from '../lib/audit.js';
import { createNotification } from '../lib/notifications.js';
import { sendPaymentReceivedEmail } from '../lib/email.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

type RazorpayWebhook = {
  event?: string;
  entity?: unknown;
  contains?: string[];
  payload?: Record<string, { entity?: unknown }>;
};

export function extractPaymentEntity(event: RazorpayWebhook): Record<string, unknown> {
  const containsKey = event.contains?.[0] ?? 'payment';
  const wrapped = event.payload?.[containsKey]?.entity;
  if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) {
    return wrapped as Record<string, unknown>;
  }
  const direct = event.entity;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return direct as Record<string, unknown>;
  }
  return {};
}

export function createWebhookRouter(logger: Logger): Router {
  const webhookRouter = Router();

  const webhookLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    keyPrefix: 'webhook',
    message: 'Too many webhook requests.',
  });

  webhookRouter.post('/api/webhooks/payment', webhookLimiter, async (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) {
      logger.warn('webhook rejected: missing signature');
      res.status(401).json({ data: null, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature.' }, meta: null });
      return;
    }

    let event: RazorpayWebhook;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhook;
    } catch {
      res.status(400).json({ data: null, error: { code: 'INVALID_WEBHOOK', message: 'Malformed webhook body.' }, meta: null });
      return;
    }

    const entity = extractPaymentEntity(event);
    const paymentId = String(entity.id ?? '');
    const orderId = String(entity.order_id ?? '');
    const currency = String(entity.currency ?? '').toUpperCase();
    const amountMinor = Number(entity.amount ?? -1);
    const captured = event.event === 'payment.captured' || String(entity.status) === 'captured';
    const failed = event.event === 'payment.failed' || String(entity.status) === 'failed';

    if (!paymentId || !orderId) {
      logger.warn({ eventName: event.event, event }, 'webhook rejected: payload missing payment identifiers');
      res.status(400).json({ data: null, error: { code: 'INVALID_WEBHOOK', message: 'Webhook payload is missing identifiers.' }, meta: null });
      return;
    }

    const { secret } = await getWebhookSecretForOrder(orderId);
    if (!secret) {
      logger.warn('webhook received but payment gateway is not configured');
      res.status(503).json({ data: null, error: { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Payment gateway is not configured.' }, meta: null });
      return;
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      logger.warn({ orderId, eventName: event.event }, 'webhook rejected: invalid signature');
      res.status(401).json({ data: null, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature.' }, meta: null });
      return;
    }

    const payment = await Payment.findOne({ gatewayOrderId: orderId });
    if (!payment) {
      logger.info({ orderId, eventName: event.event }, 'webhook matched no payment order');
      res.status(200).json({ data: { success: false, reason: 'PAYMENT_NOT_FOUND' }, error: null, meta: null });
      return;
    }

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) {
      res.status(200).json({ data: { success: false, reason: 'INVOICE_NOT_FOUND' }, error: null, meta: null });
      return;
    }

    if (toMinor(payment.amount) !== amountMinor || payment.currency.toUpperCase() !== currency) {
      logger.warn(
        { orderId, expectedMinor: toMinor(payment.amount), gotMinor: amountMinor },
        'webhook rejected: amount or currency mismatch',
      );
      res.status(400).json({ data: null, error: { code: 'PAYMENT_MISMATCH', message: 'Webhook amount or currency does not match the order.' }, meta: null });
      return;
    }

    if (captured) {
      const claim = await Payment.updateOne(
        { _id: payment._id, gatewayEventId: { $exists: false } },
        { $set: { gatewayEventId: paymentId, gatewayPaymentId: paymentId, status: 'CAPTURED', paidAt: new Date(), 'metadata.method': typeof entity.method === 'string' ? entity.method.toUpperCase() : null } },
      );

      if (claim.matchedCount === 0) {
        logger.info({ paymentId, orderId }, 'webhook duplicate captured event');
        res.status(200).json({ data: { success: true, duplicate: true }, error: null, meta: null });
        return;
      }

      if (invoice.status !== 'PAID') {
        invoice.status = 'PAID';
        invoice.paidAt = new Date();
        await invoice.save();
      }

      const business = await Business.findById(payment.businessId);
      await writeAuditLog({
        businessId: payment.businessId,
        actorUserId: business?.ownerId ?? payment.businessId,
        action: 'payment_captured',
        entityType: 'payment',
        entityId: paymentId,
        metadata: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount },
      });

      try {
        await createNotification({
          businessId: payment.businessId,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment received',
          message: `Payment received for ${invoice.invoiceNumber}`,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: payment.amount,
        });
      } catch (err) {
        logger.warn({ err }, 'failed to record payment received notification');
      }

      if (business && business.notifyPaymentReceived !== false) {
        try {
          const owner = await User.findById(business.ownerId).select('email').lean();
          if (owner?.email) {
            const amount = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: payment.currency || 'INR',
              minimumFractionDigits: 2,
            }).format(payment.amount);
            await sendPaymentReceivedEmail({
              to: owner.email,
              businessName: business.name,
              invoiceNumber: invoice.invoiceNumber,
              totalAmount: amount,
              currency: payment.currency || 'INR',
            });
          }
        } catch (error) {
          logger.warn({ err: error }, 'failed to send payment notification email');
        }
      }

      logger.info({ paymentId, orderId, invoice: invoice.invoiceNumber }, 'payment captured, invoice marked paid');
      res.status(200).json({ data: { success: true }, error: null, meta: null });
      return;
    }

    if (failed) {
      const claim = await Payment.updateOne(
        { _id: payment._id, gatewayEventId: { $exists: false } },
        { $set: { gatewayEventId: paymentId, gatewayPaymentId: paymentId, status: 'FAILED' } },
      );

      if (claim.matchedCount === 0) {
        logger.info({ paymentId, orderId }, 'webhook duplicate failed event');
        res.status(200).json({ data: { success: true, duplicate: true }, error: null, meta: null });
        return;
      }

      const business = await Business.findById(payment.businessId);
      await writeAuditLog({
        businessId: payment.businessId,
        actorUserId: business?.ownerId ?? payment.businessId,
        action: 'payment_failed',
        entityType: 'payment',
        entityId: paymentId,
        metadata: { invoiceNumber: invoice.invoiceNumber, amount: payment.amount },
      });

      try {
        await createNotification({
          businessId: payment.businessId,
          type: 'PAYMENT_FAILED',
          title: 'Payment failed',
          message: `Payment failed for ${invoice.invoiceNumber}`,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: payment.amount,
        });
      } catch (err) {
        logger.warn({ err }, 'failed to record payment failed notification');
      }

      logger.info({ paymentId, orderId, invoice: invoice.invoiceNumber }, 'payment failed');
      res.status(200).json({ data: { success: true }, error: null, meta: null });
      return;
    }

    res.status(200).json({ data: { success: false, reason: 'UNHANDLED_EVENT' }, error: null, meta: null });
  });

  return webhookRouter;
}