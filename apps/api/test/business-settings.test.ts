import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateBusinessSchema, changePasswordSchema } from '@payflow/validation';

test('business settings schema accepts a full invoice-defaults payload', () => {
  const parsed = updateBusinessSchema.safeParse({
    defaultTaxRate: 12,
    defaultTaxType: 'IGST',
    defaultDueDays: 7,
    invoiceNotes: 'Payment due within 7 days.',
    thankYouNote: 'Thank you for your business!',
    logoUrl: 'https://example.com/logo.png',
    notifyInvoiceSent: false,
    notifyPaymentReceived: true,
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.defaultTaxRate, 12);
  assert.equal(parsed.data.defaultTaxType, 'IGST');
  assert.equal(parsed.data.defaultDueDays, 7);
  assert.equal(parsed.data.notifyInvoiceSent, false);
  assert.equal(parsed.data.notifyPaymentReceived, true);
});

test('business settings schema keeps false boolean preferences', () => {
  const parsed = updateBusinessSchema.safeParse({ notifyInvoiceSent: false });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.notifyInvoiceSent, false);
});

test('business settings schema rejects an out-of-range tax rate', () => {
  assert.equal(updateBusinessSchema.safeParse({ defaultTaxRate: 101 }).success, false);
  assert.equal(updateBusinessSchema.safeParse({ defaultTaxRate: -1 }).success, false);
});

test('business settings schema rejects fractional or out-of-range due days', () => {
  assert.equal(updateBusinessSchema.safeParse({ defaultDueDays: 3.5 }).success, false);
  assert.equal(updateBusinessSchema.safeParse({ defaultDueDays: 366 }).success, false);
  assert.equal(updateBusinessSchema.safeParse({ defaultDueDays: -1 }).success, false);
});

test('business settings schema rejects an invalid tax type and logo url', () => {
  assert.equal(updateBusinessSchema.safeParse({ defaultTaxType: 'GST' }).success, false);
  assert.equal(updateBusinessSchema.safeParse({ logoUrl: 'not-a-url' }).success, false);
});

test('business settings schema rejects notes that are too long', () => {
  assert.equal(updateBusinessSchema.safeParse({ invoiceNotes: 'x'.repeat(2001) }).success, false);
  assert.equal(updateBusinessSchema.safeParse({ thankYouNote: 'x'.repeat(2001) }).success, false);
});

test('business settings schema strips unknown keys', () => {
  const parsed = updateBusinessSchema.safeParse({ defaultTaxRate: 5, unknownField: true });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal('unknownField' in parsed.data, false);
});

test('change password schema accepts a valid change', () => {
  const parsed = changePasswordSchema.safeParse({ currentPassword: 'OldPass123!', newPassword: 'NewPass456!' });
  assert.equal(parsed.success, true);
});

test('change password schema rejects a short new password', () => {
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'OldPass123!', newPassword: 'short' }).success, false);
});

test('change password schema requires the current password', () => {
  assert.equal(changePasswordSchema.safeParse({ newPassword: 'NewPass456!' }).success, false);
});