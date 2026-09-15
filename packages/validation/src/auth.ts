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
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
