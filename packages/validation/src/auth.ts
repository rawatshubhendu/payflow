import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters')
    .trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendOtpSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, 'Reset code must be exactly 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100).trim().optional(),
  email: z.string().email('Invalid business email').toLowerCase().trim().optional(),
  phone: z.string().max(20).trim().optional(),
  address: z.string().max(500).trim().optional(),
  currency: z.string().min(3).max(3).default('INR').optional(),
  invoicePrefix: z.string().min(1).max(10).trim().default('INV-').optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  defaultTaxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%').optional(),
  defaultTaxType: z.enum(['NONE', 'CGST_SGST', 'IGST']).optional(),
  defaultDueDays: z.number().int('Due days must be a whole number').min(0, 'Due days cannot be negative').max(365, 'Due days cannot exceed 365').optional(),
  invoiceNotes: z.string().max(2000, 'Invoice notes cannot exceed 2000 characters').trim().optional(),
  thankYouNote: z.string().max(2000, 'Thank-you note cannot exceed 2000 characters').trim().optional(),
  notifyInvoiceSent: z.boolean().optional(),
  notifyPaymentReceived: z.boolean().optional(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100, 'Password is too long'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
