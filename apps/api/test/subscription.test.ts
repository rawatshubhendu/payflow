import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_CATALOG } from '@payflow/types';
import { planFeatures, planLimit } from '../src/lib/subscription.js';

test('plan limits match the published catalog', () => {
  assert.equal(planLimit('FREE'), PLAN_CATALOG.FREE.invoiceLimitPerMonth);
  assert.equal(planLimit('PRO'), PLAN_CATALOG.PRO.invoiceLimitPerMonth);
  assert.equal(planLimit('BUSINESS'), PLAN_CATALOG.BUSINESS.invoiceLimitPerMonth);
});

test('free plan allows exactly 5 invoices per month', () => {
  assert.equal(planLimit('FREE'), 5);
});

test('paid plans cost per the catalog', () => {
  assert.equal(PLAN_CATALOG.PRO.pricePerMonth, 999);
  assert.equal(PLAN_CATALOG.BUSINESS.pricePerMonth, 2499);
  assert.equal(PLAN_CATALOG.FREE.pricePerMonth, 0);
});

test('plan orders expose a narrower free tier than pro', () => {
  assert.ok(planLimit('PRO') > planLimit('FREE'));
  assert.ok(planLimit('BUSINESS') > planLimit('PRO'));
});

test('free plan locks analytics charts, branding and reminders', () => {
  const features = planFeatures('FREE');
  assert.equal(features.analyticsCharts, false);
  assert.equal(features.customBranding, false);
  assert.equal(features.paymentReminders, false);
});

test('pro and business plans unlock all paid features', () => {
  const pro = planFeatures('PRO');
  const business = planFeatures('BUSINESS');
  assert.equal(pro.analyticsCharts, true);
  assert.equal(pro.customBranding, true);
  assert.equal(pro.paymentReminders, true);
  assert.deepEqual(business, pro);
});