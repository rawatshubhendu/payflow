import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../config/env.js';

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return await bcrypt.hash(otp, 12);
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(otp, hash);
}

export function isDevEmailMode(env = loadEnv()): boolean {
  if (env.EMAIL_DEV_MODE) {
    return true;
  }
  return !(env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM);
}

export async function sendVerificationEmail(email: string, otp: string): Promise<void> {
  const env = loadEnv();

  if (!isDevEmailMode(env) && env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM) {
    // Production mode: Send via Resend
    try {
      const emailApiBase = env.EMAIL_INTERCEPT_URL ?? 'https://api.resend.com';
      const response = await fetch(`${emailApiBase}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [email],
          subject: 'Verify your PayFlow account',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Verify your PayFlow account</h2>
              <p style="color: #666; line-height: 1.6;">Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${otp}</span>
              </div>
              <p style="color: #666; line-height: 1.6;">This code will expire in 15 minutes.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email provider error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as { id: string };
      // In production, you might want to log the message ID for debugging
      if (env.NODE_ENV === 'development') {
        console.log('Email sent successfully, Message ID:', result.id);
      }
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  } else {
    // Development mode: Log to console
    console.log('\n┌──────────────────────────────────────────────┐');
    console.log('│             PAYFLOW EMAIL SERVICE            │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│ To:   ${email.padEnd(39)}│`);
    console.log(`│ Code: ${otp.padEnd(39)}│`);
    console.log('│ Validity: 15 minutes                         │');
    console.log('└──────────────────────────────────────────────┘\n');
  }
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<void> {
  const env = loadEnv();

  if (!isDevEmailMode(env) && env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM) {
    try {
      const emailApiBase = env.EMAIL_INTERCEPT_URL ?? 'https://api.resend.com';
      const response = await fetch(`${emailApiBase}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [email],
          subject: 'Reset your PayFlow password',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Reset your PayFlow password</h2>
              <p style="color: #666; line-height: 1.6;">Your password reset code is:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${otp}</span>
              </div>
              <p style="color: #666; line-height: 1.6;">Enter it on the reset page together with your new password. This code will expire in 15 minutes.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email provider error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email. Please try again.');
    }
  } else {
    console.log('\n┌──────────────────────────────────────────────┐');
    console.log('│             PAYFLOW EMAIL SERVICE            │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│ To:   ${email.padEnd(39)}│`);
    console.log(`│ Code: ${otp.padEnd(39)}│`);
    console.log('│ Type: password reset (15 min validity)       │');
    console.log('└──────────────────────────────────────────────┘\n');
  }
}

interface InvoiceEmailData {
  to: string;
  businessName: string;
  invoiceNumber: string;
  totalAmount: string;
  currency: string;
  dueDate: string;
  paymentUrl: string;
}

export async function sendInvoiceSentEmail(data: InvoiceEmailData): Promise<void> {
  const env = loadEnv();

  if (!isDevEmailMode(env) && env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM) {
    try {
      const emailApiBase = env.EMAIL_INTERCEPT_URL ?? 'https://api.resend.com';
      const response = await fetch(`${emailApiBase}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [data.to],
          subject: `${data.businessName} sent you an invoice ${data.invoiceNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Invoice ${data.invoiceNumber}</h2>
              <p style="color: #666; line-height: 1.6;">${data.businessName} has sent you an invoice for ${data.totalAmount}.</p>
              <p style="color: #666; line-height: 1.6;">Amount due: <strong>${data.totalAmount}</strong></p>
              <p style="color: #666; line-height: 1.6;">Due by: <strong>${data.dueDate}</strong></p>
              <a href="${data.paymentUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 12px;">View invoice</a>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Pay via this secure payment link. If you have any questions, reply to ${data.businessName} directly.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email provider error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to send invoice email:', error);
    }
  } else {
    console.log('\n┌──────────────────────────────────────────────┐');
    console.log('│             PAYFLOW EMAIL SERVICE            │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│ To:   ${data.to.padEnd(39)}│`);
    console.log(`│ Type: Invoice ${data.invoiceNumber.padEnd(25)}│`);
    console.log(`│ Amt:  ${data.totalAmount.padEnd(39)}│`);
    console.log(`│ Link: ${data.paymentUrl.slice(0, 39).padEnd(39)}│`);
    console.log('└──────────────────────────────────────────────┘\n');
  }
}

interface PaymentReceivedEmailData {
  to: string;
  businessName: string;
  invoiceNumber: string;
  totalAmount: string;
  currency: string;
}

export async function sendPaymentReceivedEmail(data: PaymentReceivedEmailData): Promise<void> {
  const env = loadEnv();

  if (!isDevEmailMode(env) && env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM) {
    try {
      const emailApiBase = env.EMAIL_INTERCEPT_URL ?? 'https://api.resend.com';
      const response = await fetch(`${emailApiBase}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [data.to],
          subject: `🎉 Payment received for ${data.invoiceNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #16a34a;">Payment received</h2>
              <p style="color: #666; line-height: 1.6;">${data.businessName} received a payment for <strong>${data.totalAmount}</strong> against invoice <strong>${data.invoiceNumber}</strong>.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">Automated from PayFlow.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email provider error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to send payment received email:', error);
    }
  } else {
    console.log('\n┌──────────────────────────────────────────────┐');
    console.log('│             PAYFLOW EMAIL SERVICE            │');
    console.log('├──────────────────────────────────────────────┤');
    console.log(`│ To:   ${data.to.padEnd(39)}│`);
    console.log(`│ Type: Payment received for ${data.invoiceNumber.padEnd(19)}│`);
    console.log(`│ Amt:  ${data.totalAmount.padEnd(39)}│`);
    console.log('└──────────────────────────────────────────────┘\n');
  }
}
