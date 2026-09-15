import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long').trim(),
  quantity: z.number().positive('Quantity must be greater than zero').max(1_000_000, 'Quantity is too large'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').max(1_000_000_000, 'Unit price is too large'),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

export const taxTypeSchema = z.enum(['NONE', 'CGST_SGST', 'IGST']);

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item').max(100, 'Maximum 100 line items'),
  discountAmount: z.number().nonnegative('Discount cannot be negative').optional(),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
  taxType: taxTypeSchema.optional(),
  issueDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid issue date')
    .optional(),
  dueDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid due date')
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = createInvoiceSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;