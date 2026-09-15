import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { customerSchema, updateCustomerSchema } from '@payflow/validation';
import type { ApiResponse, CustomerSummary } from '@payflow/types';
import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { formatCustomer } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { sendApiError, sendValidationError } from '../lib/http.js';

export const customerRouter = Router();

customerRouter.get('/api/customers', requireAuth, async (req: Request, res: Response<ApiResponse<CustomerSummary[]>>) => {
  const customers = await Customer.find({ businessId: req.business!._id }).sort({ createdAt: -1 });
  res.status(200).json({
    data: customers.map(formatCustomer),
    error: null,
    meta: null,
  });
});

customerRouter.post('/api/customers', requireAuth, async (req: Request, res: Response<ApiResponse<CustomerSummary>>) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error, 'Invalid customer details.');
    return;
  }

  const customer = await Customer.create({ businessId: req.business!._id, ...parsed.data });
  res.status(201).json({
    data: formatCustomer(customer),
    error: null,
    meta: null,
  });
});

customerRouter.patch('/api/customers/:id', requireAuth, async (req: Request, res: Response<ApiResponse<CustomerSummary>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error, 'Invalid customer details.');
    return;
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, businessId: req.business!._id },
    { $set: parsed.data },
    { new: true },
  );
  if (!customer) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  res.status(200).json({
    data: formatCustomer(customer),
    error: null,
    meta: null,
  });
});

customerRouter.delete('/api/customers/:id', requireAuth, async (req: Request, res: Response<ApiResponse<{ success: boolean }>>) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  const customer = await Customer.findOne({ _id: req.params.id, businessId: req.business!._id });
  if (!customer) {
    sendApiError(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
    return;
  }

  const invoiceCount = await Invoice.countDocuments({ businessId: req.business!._id, customerId: customer._id });
  if (invoiceCount > 0) {
    sendApiError(res, 409, {
      code: 'CUSTOMER_HAS_INVOICES',
      message: 'This customer already has invoices and cannot be deleted.',
    });
    return;
  }

  await customer.deleteOne();
  res.status(200).json({
    data: { success: true },
    error: null,
    meta: null,
  });
});