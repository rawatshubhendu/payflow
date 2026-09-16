import { Router, type Request, type Response } from 'express';
import type { ApiResponse, PublicInvoice, PaymentOrderResult } from '@payflow/types';
import { Invoice, type IInvoice } from '../models/Invoice.js';
import { Business } from '../models/Business.js';
import { Payment } from '../models/Payment.js';
import { effectiveStatus } from '../lib/invoice-status.js';
import { getOrCreateSubscription } from '../lib/subscription.js';
import { getPaymentProviderForBusiness } from '../lib/payment/gateway.js';
import { toMinor } from '../lib/payment/provider.js';
import { writeAuditLog } from '../lib/audit.js';
import { sendApiError } from '../lib/http.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

export const publicRouter = Router();

const payOrderLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyPrefix: 'pay-order',
  message: 'Too many payment attempts. Please wait and try again.',
});

function loadPublicInvoice(invoice: IInvoice, businessName: string, businessLogoUrl?: string): PublicInvoice {
  const status = effectiveStatus(invoice) === 'DRAFT' ? 'SENT' : effectiveStatus(invoice);
  return {
    businessName,
    businessLogoUrl,
    invoiceNumber: invoice.invoiceNumber,
    status: status as PublicInvoice['status'],
    currency: invoice.currency || 'INR',
    totalAmount: invoice.totalAmount,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    taxableAmount: invoice.taxableAmount,
    taxAmount: invoice.taxAmount,
    taxRate: invoice.taxRate,
    taxType: invoice.taxType,
    items: invoice.items.map(({ description, quantity, unitPrice, lineTotal }) => ({
      description,
      quantity,
      unitPrice,
      lineTotal,
    })),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
  };
}

publicRouter.get(
  '/api/public/invoices/:publicToken',
  async (req: Request, res: Response<ApiResponse<PublicInvoice>>) => {
    const invoice = await Invoice.findOne({ publicToken: req.params.publicToken });
    if (!invoice || invoice.status === 'DRAFT') {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const business = await Business.findById(invoice.businessId);
    if (!business) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const subscription = await getOrCreateSubscription(invoice.businessId);
    const logoUrl = subscription.plan === 'FREE' ? undefined : business.logoUrl;

    res.status(200).json({
      data: loadPublicInvoice(invoice, business.name, logoUrl),
      error: null,
      meta: null,
    });
  },
);

publicRouter.post(
  '/api/public/invoices/:publicToken/order',
  payOrderLimiter,
  async (req: Request, res: Response<ApiResponse<PaymentOrderResult>>) => {
    const invoice = await Invoice.findOne({ publicToken: req.params.publicToken });
    if (!invoice || invoice.status === 'DRAFT') {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const status = effectiveStatus(invoice);
    if (status === 'PAID' || status === 'CANCELLED') {
      sendApiError(res, 409, {
        code: 'PAYMENT_NOT_OPEN',
        message: 'This invoice is no longer open for payment.',
      });
      return;
    }

    const business = await Business.findById(invoice.businessId);
    if (!business) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const provider = await getPaymentProviderForBusiness(invoice.businessId);
    if (!provider) {
      sendApiError(res, 503, {
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: 'The payment gateway is not configured yet.',
      });
      return;
    }

    const activeOrder = await Payment.findOne({ invoiceId: invoice._id, status: 'CREATED' });
    if (activeOrder) {
      res.status(200).json({
        data: {
          orderId: activeOrder.gatewayOrderId,
          gateway: activeOrder.gateway,
          keyId: provider.keyId,
          amount: invoice.totalAmount,
          currency: invoice.currency || 'INR',
          clientSecret: null,
        },
        error: null,
        meta: null,
      });
      return;
    }

    const result = await provider.createOrder({
      amountMinor: toMinor(invoice.totalAmount),
      currency: invoice.currency || 'INR',
      receipt: invoice.invoiceNumber,
      notes: { invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber },
    });

    await Payment.create({
      businessId: business._id,
      invoiceId: invoice._id,
      gateway: provider.name,
      gatewayOrderId: result.gatewayOrderId,
      amount: invoice.totalAmount,
      currency: invoice.currency || 'INR',
      status: 'CREATED',
    });

    if (invoice.status === 'SENT') {
      invoice.status = 'PENDING';
      await invoice.save();
    }

    await writeAuditLog({
      businessId: business._id,
      actorUserId: business.ownerId,
      action: 'payment_order_created',
      entityType: 'payment',
      entityId: result.gatewayOrderId,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount, via: 'public' },
    });

    res.status(200).json({
      data: {
        orderId: result.gatewayOrderId,
        gateway: provider.name,
        keyId: provider.keyId,
        amount: invoice.totalAmount,
        currency: invoice.currency || 'INR',
        clientSecret: null,
      },
      error: null,
      meta: null,
    });
  },
);