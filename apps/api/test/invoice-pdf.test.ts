import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IBusiness } from '../src/models/Business.js';
import type { ICustomer } from '../src/models/Customer.js';
import type { IInvoice } from '../src/models/Invoice.js';
import { generateInvoicePdf } from '../src/lib/invoice-pdf.js';

function fixture(): { business: IBusiness; customer: ICustomer; invoice: IInvoice } {
  return {
    business: {
      name: 'Studio X Design',
      address: 'Mumbai, Maharashtra',
      email: 'billing@studiox.in',
      phone: '9820012345',
      currency: 'INR',
    } as IBusiness,
    customer: {
      name: 'Acme Pvt Ltd',
      company: 'Acme Pvt Ltd',
      email: 'accounts@acme.in',
      phone: '022-4000-1234',
    } as ICustomer,
    invoice: {
      invoiceNumber: 'INV-001',
      status: 'SENT',
      issueDate: new Date('2026-09-01T00:00:00.000Z'),
      dueDate: new Date('2026-09-30T00:00:00.000Z'),
      items: [
        { description: 'Logo design', quantity: 1, unitPrice: 50000, lineTotal: 50000 },
        { description: 'Website build', quantity: 2, unitPrice: 40000, lineTotal: 80000 },
      ],
      currency: 'INR',
      subtotal: 130000,
      discountAmount: 10000,
      taxableAmount: 120000,
      taxRate: 18,
      taxType: 'IGST',
      taxAmount: 21600,
      totalAmount: 141600,
      publicToken: 'payflow_xyz',
    } as IInvoice,
  };
}

describe('generateInvoicePdf', () => {
  it('returns a valid PDF buffer with the invoice details', async () => {
    const { business, customer, invoice } = fixture();
    const pdf = await generateInvoicePdf({ business, customer, invoice });

    assert.ok(Buffer.isBuffer(pdf));
    assert.ok(pdf.length > 1000, `expected a substantial PDF, got ${pdf.length} bytes`);
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
    assert.ok(pdf.includes('startxref'));
    assert.ok(pdf.includes('Invoice INV-001'));
    assert.ok(pdf.includes('Studio X Design'));
  });

  it('handles a CGST + SGST invoice', async () => {
    const { business, customer, invoice } = fixture();
    invoice.taxType = 'CGST_SGST';
    invoice.taxRate = 18;
    invoice.taxAmount = 21600;

    const pdf = await generateInvoicePdf({ business, customer, invoice });
    assert.ok(pdf.length > 1000);
    assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  });
});

describe('generateInvoicePdf: edge cases', () => {
  it('handles invoices without a due date', async () => {
    const { business, customer, invoice } = fixture();
    invoice.dueDate = null;

    const pdf = await generateInvoicePdf({ business, customer, invoice });
    assert.ok(pdf.length > 1000);
  });
});