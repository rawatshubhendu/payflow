import type { Types } from 'mongoose';
import type { InvoiceSummary } from '@payflow/types';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { formatInvoiceSummary } from './serializers.js';

export async function loadInvoiceSummaries(
  businessId: Types.ObjectId,
  query: Record<string, unknown> = {},
  limit?: number,
): Promise<InvoiceSummary[]> {
  const cursor = Invoice.find({ businessId, ...query }).sort({ createdAt: -1 });
  if (limit) {
    cursor.limit(limit);
  }
  const invoices = await cursor;

  const customerIds = [...new Set(invoices.map((invoice) => invoice.customerId.toString()))];
  const customers = customerIds.length
    ? await Customer.find({ businessId, _id: { $in: customerIds } }).select('_id name').lean()
    : [];
  const customerNames = new Map(customers.map((customer) => [customer._id.toString(), customer.name]));

  return invoices.map((invoice) =>
    formatInvoiceSummary(invoice, customerNames.get(invoice.customerId.toString()) ?? null),
  );
}