import type { InvoiceStatus } from '@payflow/types';
import type { IInvoice } from '../models/Invoice.js';

const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
  PENDING: ['PAID', 'OVERDUE', 'CANCELLED'],
  PAID: [],
  OVERDUE: ['PAID', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function effectiveStatus(invoice: {
  status: InvoiceStatus;
  dueDate?: Date | string | null;
}): InvoiceStatus {
  if (invoice.dueDate && (invoice.status === 'SENT' || invoice.status === 'PENDING')) {
    const endOfDueDay = new Date(invoice.dueDate);
    endOfDueDay.setHours(23, 59, 59, 999);
    if (Date.now() > endOfDueDay.getTime()) {
      return 'OVERDUE';
    }
  }
  return invoice.status;
}

export function isEditable(invoice: Pick<IInvoice, 'status'>): boolean {
  return invoice.status === 'DRAFT';
}