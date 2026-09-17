import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@payflow/validation';
import type { ApiResponse, AuthResult, RegisterResult } from '@payflow/types';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { createSessionToken, setSessionCookie, clearSessionCookie } from '../lib/session.js';
import { generateOtp, hashOtp, verifyOtpHash, sendVerificationEmail, sendPasswordResetEmail, isDevEmailMode } from '../lib/email.js';
import { formatUser, formatBusiness } from '../lib/serializers.js';
import { ensureBusiness } from '../lib/business.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { writeAuditLog } from '../lib/audit.js';

export const authRouter = Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth',
  message: 'Too many attempts. Please wait a few minutes and try again.',
});

authRouter.post('/api/auth/register', authLimiter, async (req: Request, res: Response<ApiResponse<RegisterResult>>) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'body';
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration details provided.',
        fieldErrors,
      },
      meta: null,
    });
    return;
  }

  const { email, password, businessName } = parsed.data;

  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.emailVerifiedAt) {
    res.status(409).json({
      data: null,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please log in.',
      },
      meta: null,
    });
    return;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUser) {
    // User started registration earlier but did not complete verification
    existingUser.passwordHash = passwordHash;
    existingUser.verificationCodeHash = otpHash;
    existingUser.verificationCodeExpiresAt = expiresAt;
    existingUser.failedVerificationAttempts = 0;
    await existingUser.save();

    const existingBiz = await Business.findOne({ ownerId: existingUser._id });
    if (existingBiz) {
      existingBiz.name = businessName;
      await existingBiz.save();
    }
  } else {
    const user = await User.create({
      email,
      passwordHash,
      emailVerifiedAt: null,
      verificationCodeHash: otpHash,
      verificationCodeExpiresAt: expiresAt,
      failedVerificationAttempts: 0,
    });

    await Business.create({
      ownerId: user._id,
      name: businessName,
      currency: 'INR',
      invoicePrefix: 'INV-',
    });
  }

  try {
    await sendVerificationEmail(email, otp);
  } catch {
    // If email fails, don't complete registration
    res.status(500).json({
      data: null,
      error: {
        code: 'EMAIL_SEND_FAILED',
        message: 'Failed to send verification email. Please try again.',
      },
      meta: null,
    });
    return;
  }

  res.status(200).json({
    data: {
      status: 'VERIFICATION_REQUIRED',
      email,
      expiresAt: expiresAt.toISOString(),
      ...(isDevEmailMode() ? { devCode: otp } : {}),
    },
    error: null,
    meta: null,
  });
});

authRouter.post('/api/auth/verify-email', authLimiter, async (req: Request, res: Response<ApiResponse<AuthResult>>) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please provide a valid email and 6-digit verification code.',
      },
      meta: null,
    });
    return;
  }

  const { email, code } = parsed.data;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({
      data: null,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'No registration found for this email. Please sign up first.',
      },
      meta: null,
    });
    return;
  }

  if (user.emailVerifiedAt) {
    // Already verified
    const business = await ensureBusiness(user._id, user.email);

    const token = createSessionToken(user._id.toString());
    setSessionCookie(res, token);

    res.status(200).json({
      data: {
        user: formatUser(user),
        business: formatBusiness(business),
      },
      error: null,
      meta: null,
    });
    return;
  }

  // Rate limiting: Check for too many failed attempts
  const now = new Date();
  const maxAttempts = 5;
  const lockoutTime = 15 * 60 * 1000; // 15 minutes

  if (user.failedVerificationAttempts && user.failedVerificationAttempts >= maxAttempts) {
    if (user.lastVerificationAttemptAt && (now.getTime() - user.lastVerificationAttemptAt.getTime()) < lockoutTime) {
      const remainingTime = Math.ceil((lockoutTime - (now.getTime() - user.lastVerificationAttemptAt.getTime())) / 60000);
      res.status(429).json({
        data: null,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: `Too many failed attempts. Please try again in ${remainingTime} minutes.`,
        },
        meta: null,
      });
      return;
    }
    // Reset attempts after lockout period
    user.failedVerificationAttempts = 0;
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
    res.status(400).json({
      data: null,
      error: {
        code: 'OTP_EXPIRED',
        message: 'Verification code has expired. Please request a new code.',
      },
      meta: null,
    });
    return;
  }

  const isValid = await verifyOtpHash(code, user.verificationCodeHash);
  if (!isValid) {
    // Increment failed attempts
    user.failedVerificationAttempts = (user.failedVerificationAttempts || 0) + 1;
    user.lastVerificationAttemptAt = now;
    await user.save();

    const remainingAttempts = maxAttempts - user.failedVerificationAttempts;
    res.status(400).json({
      data: null,
      error: {
        code: 'INVALID_OTP',
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      },
      meta: null,
    });
    return;
  }

  // Mark verified and clear OTP
  user.emailVerifiedAt = new Date();
  user.verificationCodeHash = null;
  user.verificationCodeExpiresAt = null;
  user.failedVerificationAttempts = 0;
  user.lastVerificationAttemptAt = null;
  await user.save();

  const business = await ensureBusiness(user._id, user.email);

  const token = createSessionToken(user._id.toString());
  setSessionCookie(res, token);

  res.status(200).json({
    data: {
      user: formatUser(user),
      business: formatBusiness(business),
    },
    error: null,
    meta: null,
  });
});

authRouter.post('/api/auth/resend-otp', authLimiter, async (req: Request, res: Response<ApiResponse<{ success: boolean; expiresAt?: string }>>) => {
  const parsed = resendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid email address is required.',
      },
      meta: null,
    });
    return;
  }

  const { email } = parsed.data;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json({
      data: null,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'No account found for this email address.',
      },
      meta: null,
    });
    return;
  }

  if (user.emailVerifiedAt) {
    res.status(400).json({
      data: null,
      error: {
        code: 'ALREADY_VERIFIED',
        message: 'Email address is already verified. Please log in.',
      },
      meta: null,
    });
    return;
  }

  // Rate limiting for resend
  const now = new Date();
  const resendCooldown = 60 * 1000; // 1 minute cooldown

  if (user.lastVerificationAttemptAt && (now.getTime() - user.lastVerificationAttemptAt.getTime()) < resendCooldown) {
    const remainingTime = Math.ceil((resendCooldown - (now.getTime() - user.lastVerificationAttemptAt.getTime())) / 1000);
    res.status(429).json({
      data: null,
      error: {
        code: 'RESEND_COOLDOWN',
        message: `Please wait ${remainingTime} seconds before requesting another code.`,
      },
      meta: null,
    });
    return;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  user.verificationCodeHash = otpHash;
  user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  user.failedVerificationAttempts = 0;
  user.lastVerificationAttemptAt = now;
  await user.save();

  try {
    await sendVerificationEmail(email, otp);
  } catch {
    res.status(500).json({
      data: null,
      error: {
        code: 'EMAIL_SEND_FAILED',
        message: 'Failed to send verification email. Please try again.',
      },
      meta: null,
    });
    return;
  }

  res.status(200).json({
    data: {
      success: true,
      expiresAt: user.verificationCodeExpiresAt?.toISOString(),
      ...(isDevEmailMode() ? { devCode: otp } : {}),
    },
    error: null,
    meta: null,
  });
});

authRouter.post('/api/auth/login', authLimiter, async (req: Request, res: Response<ApiResponse<AuthResult>>) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      },
      meta: null,
    });
    return;
  }

  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({
      data: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      },
      meta: null,
    });
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    res.status(401).json({
      data: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      },
      meta: null,
    });
    return;
  }

  // If email is not verified yet, require verification
  if (!user.emailVerifiedAt) {
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    user.verificationCodeHash = otpHash;
    user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.failedVerificationAttempts = 0;
    user.lastVerificationAttemptAt = new Date();
    await user.save();

    try {
      await sendVerificationEmail(email, otp);
    } catch {
      res.status(500).json({
        data: null,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send verification email. Please try again.',
        },
        meta: null,
      });
      return;
    }

    res.status(403).json({
      data: null,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: isDevEmailMode()
          ? `Your email address is not verified yet. Your verification code is ${otp}.`
          : 'Your email address is not verified yet. We have sent a new verification code to your email.',
      },
      meta: null,
    });
    return;
  }

  const business = await ensureBusiness(user._id, user.email);

  const token = createSessionToken(user._id.toString());
  setSessionCookie(res, token);

  res.status(200).json({
    data: {
      user: formatUser(user),
      business: formatBusiness(business),
    },
    error: null,
    meta: null,
  });
});

authRouter.post('/api/auth/logout', (_req: Request, res: Response<ApiResponse<{ success: boolean }>>) => {
  clearSessionCookie(res);
  res.status(200).json({
    data: { success: true },
    error: null,
    meta: null,
  });
});

authRouter.post(
  '/api/auth/forgot-password',
  authLimiter,
  async (req: Request, res: Response<ApiResponse<{ success: boolean; expiresAt?: string }>>) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required.' },
        meta: null,
      });
      return;
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });

    if (!user || !user.emailVerifiedAt) {
      res.status(200).json({ data: { success: true }, error: null, meta: null });
      return;
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCodeHash = otpHash;
    user.verificationCodeExpiresAt = expiresAt;
    user.failedVerificationAttempts = 0;
    user.lastVerificationAttemptAt = new Date();
    await user.save();

    try {
      await sendPasswordResetEmail(email, otp);
    } catch {
      res.status(500).json({
        data: null,
        error: { code: 'EMAIL_SEND_FAILED', message: 'Failed to send reset email. Please try again.' },
        meta: null,
      });
      return;
    }

    res.status(200).json({
      data: { success: true, expiresAt: expiresAt.toISOString(), ...(isDevEmailMode() ? { devCode: otp } : {}) },
      error: null,
      meta: null,
    });
  },
);

authRouter.post(
  '/api/auth/reset-password',
  authLimiter,
  async (req: Request, res: Response<ApiResponse<{ success: boolean }>>) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email, reset code and a new password are required.' },
        meta: null,
      });
      return;
    }

    const { email, code, password } = parsed.data;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'No account found for this email address.' },
        meta: null,
      });
      return;
    }

    const now = new Date();
    const maxAttempts = 5;
    const lockoutTime = 15 * 60 * 1000;

    if (user.failedVerificationAttempts && user.failedVerificationAttempts >= maxAttempts) {
      if (user.lastVerificationAttemptAt && now.getTime() - user.lastVerificationAttemptAt.getTime() < lockoutTime) {
        res.status(429).json({
          data: null,
          error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Request a new code and try again later.' },
          meta: null,
        });
        return;
      }
      user.failedVerificationAttempts = 0;
    }

    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < now) {
      res.status(400).json({
        data: null,
        error: { code: 'OTP_EXPIRED', message: 'Reset code has expired. Please request a new code.' },
        meta: null,
      });
      return;
    }

    const isValid = await verifyOtpHash(code, user.verificationCodeHash);
    if (!isValid) {
      user.failedVerificationAttempts = (user.failedVerificationAttempts || 0) + 1;
      user.lastVerificationAttemptAt = now;
      await user.save();

      res.status(400).json({
        data: null,
        error: { code: 'INVALID_OTP', message: 'Invalid reset code.' },
        meta: null,
      });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.verificationCodeHash = null;
    user.verificationCodeExpiresAt = null;
    user.failedVerificationAttempts = 0;
    user.lastVerificationAttemptAt = null;
    await user.save();

    res.status(200).json({ data: { success: true }, error: null, meta: null });
  },
);

authRouter.patch(
  '/api/auth/password',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<{ success: boolean }>>) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and a new password (at least 8 characters) are required.',
        },
        meta: null,
      });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        meta: null,
      });
      return;
    }

    const passwordValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!passwordValid) {
      res.status(400).json({
        data: null,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Your current password is incorrect.',
        },
        meta: null,
      });
      return;
    }

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();

    await writeAuditLog({
      businessId: req.business!._id,
      actorUserId: user._id,
      action: 'password_changed',
      entityType: 'user',
      entityId: String(user._id),
    });

    res.status(200).json({ data: { success: true }, error: null, meta: null });
  },
);

authRouter.get('/api/auth/me', requireAuth, (req: Request, res: Response<ApiResponse<AuthResult>>) => {
  res.status(200).json({
    data: {
      user: formatUser(req.user!),
      business: formatBusiness(req.business!),
    },
    error: null,
    meta: null,
  });
});
