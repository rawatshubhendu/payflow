import type { TaxType, LineItem } from '@payflow/types';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type CalculationLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type CalculationInput = {
  items: CalculationLineItem[];
  discountAmount?: number;
  taxRate?: number;
  taxType?: TaxType;
};

export type InvoiceCalculation = {
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxType: TaxType;
  taxAmount: number;
  totalAmount: number;
};

export function calculateInvoice(input: CalculationInput): InvoiceCalculation {
  const taxType: TaxType = input.taxType ?? 'NONE';
  const taxRate = input.taxRate ?? 0;

  const items: LineItem[] = input.items.map((item) => ({
    ...item,
    lineTotal: roundMoney(item.quantity * item.unitPrice),
  }));

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = roundMoney(Math.min(Math.max(input.discountAmount ?? 0, 0), subtotal));
  const taxableAmount = roundMoney(subtotal - discountAmount);
  const taxAmount = taxType === 'NONE' ? 0 : roundMoney(taxableAmount * (taxRate / 100));
  const totalAmount = roundMoney(taxableAmount + taxAmount);

  return {
    items,
    subtotal,
    discountAmount,
    taxableAmount,
    taxRate,
    taxType,
    taxAmount,
    totalAmount,
  };
}

export type TaxBreakdown = { cgst: number; sgst: number; igst: number };

export function taxBreakdown(taxAmount: number, taxType: TaxType): TaxBreakdown {
  if (taxType === 'IGST') {
    return { cgst: 0, sgst: 0, igst: roundMoney(taxAmount) };
  }
  if (taxType === 'CGST_SGST') {
    const cgst = roundMoney(taxAmount / 2);
    return { cgst, sgst: roundMoney(taxAmount - cgst), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: 0 };
}
