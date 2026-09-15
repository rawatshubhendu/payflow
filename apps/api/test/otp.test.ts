import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateOtp } from '../src/lib/email.js';

describe('OTP Generation & Formatting', () => {
  it('generates a 6-digit numeric OTP in valid range', () => {
    for (let i = 0; i < 25; i++) {
      const otp = generateOtp();
      assert.match(otp, /^\d{6}$/, 'OTP must be exactly 6 numeric digits');
      const num = Number.parseInt(otp, 10);
      assert.ok(num >= 100000 && num <= 999999, 'OTP must be in range 100000-999999');
    }
  });
});
