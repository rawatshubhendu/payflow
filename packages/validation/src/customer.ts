import { z } from 'zod';

export const customerSchema = z.object({
  name: z
    .string()
    .min(2, 'Customer name must be at least 2 characters')
    .max(120, 'Customer name is too long')
    .trim(),
  email: z.string().email('Invalid customer email address').toLowerCase().trim().optional(),
  phone: z.string().max(20, 'Phone number is too long').trim().optional(),
  company: z.string().max(120, 'Company name is too long').trim().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const updateCustomerSchema = customerSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;