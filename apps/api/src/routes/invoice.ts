import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createInvoiceSchema, updateInvoiceSchema } from '@payflow/validation';
import type { ApiResponse, InvoiceSummary, InvoiceDetail, PaymentOrderResult } from '@payflow/types';
import { Invoice, type IInvoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { formatInvoiceDetail } from '../lib/serializers.js';
import { loadInvoiceSummaries } from '../lib/invoice-summaries.js';
import { calculateInvoice } from '../lib/invoice-calculation.js';
import { generateInvoiceNumber } from '../lib/invoice-number.js';
import { canTransition } from '../lib/invoice-status.js';
import { generateInvoicePdf } from '../lib/invoice-pdf.js';
import { sendInvoiceSentEmail } from '../lib/email.js';
import { getPaymentProviderForBusiness } from '../lib/payment/gateway.js';
import { assertInvoiceLimit } from '../lib/subscription.js';
import { toMinor } from '../lib/payment/provider.js';
import { writeAuditLog } from '../lib/audit.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendApiError, sendValidationError } from '../lib/http.js';
import { loadEnv } from '../config/env.js';

export const invoiceRouter = Router();

async function customerNameFor(customerId: mongoose.Types.ObjectId): Promise<string | null> {
  const customer = await Customer.findById(customerId).select('name').lean();
  return customer?.name ?? null;
}

invoiceRouter.get('/api/invoices', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceSummary[]>>) => {
  const invoices = await loadInvoiceSummaries(req.business!._id);

  res.status(200).json({
    data: invoices,
    error: null,
    meta: null,
  });
});

invoiceRouter.get('/api/invoices/:id', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!invoice) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  res.status(200).json({
    data: formatInvoiceDetail(invoice, await customerNameFor(invoice.customerId)),
    error: null,
    meta: null,
  });
});

invoiceRouter.post('/api/invoices', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error, 'Invalid invoice details.');
    return;
  }

  const customer = await Customer.findOne({ _id: parsed.data.customerId, businessId: req.business!._id });
  if (!customer) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  try {
    await assertInvoiceLimit(req.business!._id);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 403) {
      sendApiError(res, 403, { code: 'PLAN_LIMIT_REACHED', message: err.message });
      return;
    }
    throw err;
  }

  const calculation = calculateInvoice({
    items: parsed.data.items,
    discountAmount: parsed.data.discountAmount,
    taxRate: parsed.data.taxRate,
    taxType: parsed.data.taxType,
  });

  const business = req.business!;
  const invoiceData: Partial<IInvoice> = {
    businessId: business._id,
    customerId: customer._id,
    currency: business.currency || 'INR',
    items: calculation.items,
    subtotal: calculation.subtotal,
    discountAmount: calculation.discountAmount,
    taxableAmount: calculation.taxableAmount,
    taxRate: calculation.taxRate,
    taxType: calculation.taxType,
    taxAmount: calculation.taxAmount,
    totalAmount: calculation.totalAmount,
    issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    publicToken: randomBytes(24).toString('base64url'),
  };

  let invoice: IInvoice | null = null;
  for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
    const invoiceNumber = await generateInvoiceNumber(business._id, business.invoicePrefix);
    try {
      invoice = await Invoice.create({ ...invoiceData, invoiceNumber });
    } catch (err) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000 && attempt < 2) {
        continue;
      }
      throw err;
    }
  }

  res.status(201).json({
    data: formatInvoiceDetail(invoice!, await customerNameFor(customer._id)),
    error: null,
    meta: null,
  });
});

invoiceRouter.patch('/api/invoices/:id', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!invoice) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  if (invoice.status !== 'DRAFT') {
    sendApiError(res, 409, {
      code: 'INVOICE_NOT_EDITABLE',
      message: 'Only draft invoices can be edited.',
    });
    return;
  }

  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error, 'Invalid invoice details.');
    return;
  }

  if (parsed.data.customerId) {
    const customer = await Customer.findOne({ _id: parsed.data.customerId, businessId: req.business!._id });
    if (!customer) {
      sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
      return;
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.customerId !== undefined) update.customerId = parsed.data.customerId;
  if (parsed.data.issueDate !== undefined) update.issueDate = parsed.data.issueDate ? new Date(parsed.data.issueDate) : null;
  if (parsed.data.dueDate !== undefined) update.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

  const shouldRecompute =
    parsed.data.items !== undefined ||
    parsed.data.discountAmount !== undefined ||
    parsed.data.taxRate !== undefined ||
    parsed.data.taxType !== undefined;

  if (shouldRecompute) {
    const calculation = calculateInvoice({
      items: parsed.data.items ?? invoice.items,
      discountAmount: parsed.data.discountAmount ?? invoice.discountAmount,
      taxRate: parsed.data.taxRate ?? invoice.taxRate,
      taxType: parsed.data.taxType ?? invoice.taxType,
    });
    update.items = calculation.items;
    update.subtotal = calculation.subtotal;
    update.discountAmount = calculation.discountAmount;
    update.taxableAmount = calculation.taxableAmount;
    update.taxRate = calculation.taxRate;
    update.taxType = calculation.taxType;
    update.taxAmount = calculation.taxAmount;
    update.totalAmount = calculation.totalAmount;
  }

  const updated = await Invoice.findByIdAndUpdate(invoice._id, { $set: update }, { new: true });
  if (!updated) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  res.status(200).json({
    data: formatInvoiceDetail(updated, await customerNameFor(updated.customerId)),
    error: null,
    meta: null,
  });
});

invoiceRouter.post('/api/invoices/:id/send', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!invoice) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  if (!canTransition(invoice.status, 'SENT')) {
    sendApiError(res, 409, {
      code: 'INVOICE_NOT_SENDABLE',
      message: 'Only draft invoices can be sent.',
    });
    return;
  }

  const customer = await Customer.findOne({ _id: invoice.customerId, businessId: req.business!._id });
  if (!customer) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  if (!customer.email) {
    sendApiError(res, 409, {
      code: 'CUSTOMER_EMAIL_REQUIRED',
      message: 'This customer has no email address. Add an email before sending.',
    });
    return;
  }

  const env = loadEnv();
  const paymentUrl = new URL(`/pay/${invoice.publicToken}`, env.WEB_ORIGIN).toString();
  const currency = invoice.currency || 'INR';
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(invoice.totalAmount);
  const dueLabel = invoice.dueDate
    ? invoice.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'no due date';

  if (req.business!.notifyInvoiceSent !== false) {
    await sendInvoiceSentEmail({
      to: customer.email,
      businessName: req.business!.name,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: amount,
      currency,
      dueDate: dueLabel,
      paymentUrl,
    });
  }

  invoice.status = 'SENT';
  invoice.sentAt = new Date();
  await invoice.save();

  res.status(200).json({
    data: formatInvoiceDetail(invoice, customer.name),
    error: null,
    meta: null,
  });
});

invoiceRouter.post('/api/invoices/:id/cancel', requireAuth, async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!invoice) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  if (!canTransition(invoice.status, 'CANCELLED')) {
    sendApiError(res, 409, {
      code: 'INVOICE_NOT_CANCELLABLE',
      message: 'This invoice cannot be cancelled.',
    });
    return;
  }

  invoice.status = 'CANCELLED';
  await invoice.save();

  res.status(200).json({
    data: formatInvoiceDetail(invoice, await customerNameFor(invoice.customerId)),
    error: null,
    meta: null,
  });
});

invoiceRouter.delete('/api/invoices/:id', requireAuth, async (req: Request, res: Response<ApiResponse<{ success: boolean }>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!invoice) {
    sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
    return;
  }

  if (invoice.status !== 'DRAFT') {
    sendApiError(res, 409, {
      code: 'INVOICE_NOT_DELETABLE',
      message: 'Only draft invoices can be deleted.',
    });
    return;
  }

  await invoice.deleteOne();

  res.status(200).json({ data: { success: true }, error: null, meta: null });
});

invoiceRouter.post(
  '/api/invoices/:id/pdf',
  requireAuth,
  async (req: Request, res: Response) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
    if (!invoice) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const customer = await Customer.findById(invoice.customerId);
    if (!customer) {
      sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
      return;
    }

    const pdf = await generateInvoicePdf({ business: req.business!, customer, invoice });
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  },
);

invoiceRouter.post(
  '/api/invoices/:id/payment-order',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentOrderResult>>) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.business!._id });
    if (!invoice) {
      sendApiError(res, 404, { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' });
      return;
    }

    if (invoice.status !== 'SENT' && invoice.status !== 'PENDING') {
      sendApiError(res, 409, {
        code: 'PAYMENT_NOT_OPEN',
        message: 'Invoice must be sent before a payment order can be created.',
      });
      return;
    }

    const provider = await getPaymentProviderForBusiness(req.business!._id);
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
      businessId: req.business!._id,
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
      businessId: req.business!._id,
      actorUserId: req.user!._id,
      action: 'payment_order_created',
      entityType: 'payment',
      entityId: result.gatewayOrderId,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount },
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