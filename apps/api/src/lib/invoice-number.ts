import type { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.js';

export async function generateInvoiceNumber(businessId: Types.ObjectId, prefix: string): Promise<string> {
  const normalizedPrefix = prefix.trim() || 'INV-';
  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const invoices = await Invoice.find({
    businessId,
    invoiceNumber: { $regex: `^${escapedPrefix}` },
  })
    .select('invoiceNumber')
    .lean();

  let highest = 0;
  for (const invoice of invoices) {
    const parsed = Number.parseInt(invoice.invoiceNumber.slice(normalizedPrefix.length), 10);
    if (!Number.isNaN(parsed) && parsed > highest) {
      highest = parsed;
    }
  }

  return `${normalizedPrefix}${String(highest + 1).padStart(3, '0')}`;
}