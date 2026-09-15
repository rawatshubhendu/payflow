import type { UserSummary, BusinessSummary, CustomerSummary, InvoiceSummary, InvoiceDetail } from '@payflow/types';
import type { IUser } from '../models/User.js';
import type { IBusiness } from '../models/Business.js';
import type { ICustomer } from '../models/Customer.js';
import type { IInvoice } from '../models/Invoice.js';
import { effectiveStatus } from './invoice-status.js';

export function formatUser(user: IUser): UserSummary {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
  };
}

export function formatBusiness(business: IBusiness): BusinessSummary {
  return {
    id: business._id.toString(),
    name: business.name,
    currency: business.currency,
    invoicePrefix: business.invoicePrefix,
    email: business.email,
    phone: business.phone,
    address: business.address,
    logoUrl: business.logoUrl,
  };
}

export function formatCustomer(customer: ICustomer): CustomerSummary {
  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    createdAt: customer.createdAt.toISOString(),
  };
}

export function formatInvoiceSummary(invoice: IInvoice, customerName: string | null): InvoiceSummary {
  return {
    id: invoice._id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    status: effectiveStatus(invoice),
    customer: { id: invoice.customerId.toString(), name: customerName ?? 'Deleted customer' },
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    createdAt: invoice.createdAt.toISOString(),
    publicToken: invoice.publicToken,
  };
}

export function formatInvoiceDetail(invoice: IInvoice, customerName: string | null): InvoiceDetail {
  return {
    ...formatInvoiceSummary(invoice, customerName),
    items: invoice.items,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    taxableAmount: invoice.taxableAmount,
    taxRate: invoice.taxRate,
    taxType: invoice.taxType,
    taxAmount: invoice.taxAmount,
    sentAt: invoice.sentAt ? invoice.sentAt.toISOString() : null,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
  };
}
