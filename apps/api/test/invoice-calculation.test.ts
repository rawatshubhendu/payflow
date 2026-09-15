import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, roundMoney, taxBreakdown } from '../src/lib/invoice-calculation.js';

describe('calculateInvoice', () => {
  it('computes line totals and subtotal with no tax', () => {
    const result = calculateInvoice({
      items: [
        { description: 'Web development', quantity: 2, unitPrice: 25000 },
        { description: 'Design', quantity: 1, unitPrice: 15000 },
      ],
    });

    assert.deepEqual(result.items, [
      { description: 'Web development', quantity: 2, unitPrice: 25000, lineTotal: 50000 },
      { description: 'Design', quantity: 1, unitPrice: 15000, lineTotal: 15000 },
    ]);
    assert.equal(result.subtotal, 65000);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.taxAmount, 0);
    assert.equal(result.totalAmount, 65000);
  });

  it('applies intra-state GST (CGST + SGST) on taxable value after discount', () => {
    const result = calculateInvoice({
      items: [{ description: 'Consulting', quantity: 1, unitPrice: 100000 }],
      discountAmount: 5000,
      taxRate: 18,
      taxType: 'CGST_SGST',
    });

    assert.equal(result.subtotal, 100000);
    assert.equal(result.discountAmount, 5000);
    assert.equal(result.taxableAmount, 95000);
    assert.equal(result.taxAmount, 17100);
    assert.equal(result.totalAmount, 112100);
  });

  it('charges no tax when tax type is NONE even if a rate is set', () => {
    const result = calculateInvoice({
      items: [{ description: 'Design', quantity: 1, unitPrice: 25000 }],
      taxRate: 18,
      taxType: 'NONE',
    });

    assert.equal(result.taxAmount, 0);
    assert.equal(result.taxableAmount, 25000);
    assert.equal(result.totalAmount, 25000);
  });

  it('charges full IGST rate for inter-state supply', () => {
    const result = calculateInvoice({
      items: [{ description: 'Services', quantity: 1, unitPrice: 100000 }],
      taxRate: 18,
      taxType: 'IGST',
    });

    assert.equal(result.taxAmount, 18000);
    assert.equal(result.totalAmount, 118000);
  });

  it('clamps discount to subtotal and never returns negative totals', () => {
    const result = calculateInvoice({
      items: [{ description: 'X', quantity: 1, unitPrice: 100 }],
      discountAmount: 500,
    });

    assert.equal(result.discountAmount, 100);
    assert.equal(result.totalAmount, 0);
  });

  it('rounds money to two decimal places', () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(123.456), 123.46);
  });
});

describe('taxBreakdown', () => {
  it('splits tax equally between CGST and SGST for intra-state supply', () => {
    const breakdown = taxBreakdown(17100, 'CGST_SGST');

    assert.equal(breakdown.cgst, 8550);
    assert.equal(breakdown.sgst, 8550);
    assert.equal(breakdown.igst, 0);
  });

  it('keeps the full amount as IGST for inter-state supply', () => {
    const breakdown = taxBreakdown(18000, 'IGST');

    assert.equal(breakdown.igst, 18000);
    assert.equal(breakdown.cgst, 0);
    assert.equal(breakdown.sgst, 0);
  });

  it('returns zero for no tax', () => {
    const breakdown = taxBreakdown(0, 'NONE');

    assert.deepEqual(breakdown, { cgst: 0, sgst: 0, igst: 0 });
  });
});
