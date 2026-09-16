import { test, expect } from '@playwright/test';
import { registerUser, createCustomerAndInvoice, selectPlan } from './helpers';

test.describe('plan gating', () => {
  test('free plan locks charts; pro unlocks them', async ({ page }) => {
    await registerUser(page, 'Gating Studio');
    await createCustomerAndInvoice(page);

    await page.goto('/app/dashboard');
    await expect(page.getByText('Pro feature').first()).toBeVisible();
    await expect(page.getByText('Revenue over time')).toHaveCount(0);

    await page.goto('/app/analytics');
    await expect(page.getByText('Pro feature').first()).toBeVisible();
    await expect(page.getByText('Total invoiced')).toBeVisible();

    await selectPlan(page, 'PRO');
    await page.goto('/app/dashboard');
    await expect(page.getByText('Revenue over time')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Payment status')).toBeVisible();

    await page.goto('/app/analytics');
    await expect(page.getByText('Revenue over time')).toBeVisible({ timeout: 15_000 });
  });

  test('branding settings locked on free, editable on pro', async ({ page }) => {
    await registerUser(page, 'Brand Gating Studio');

    await page.goto('/app/settings');
    await page.locator('nav').getByRole('button', { name: 'Branding', exact: true }).click();
    await expect(page.getByText('Upgrade to Pro').first()).toBeVisible();
    await expect(page.getByLabel('Business logo URL')).toHaveCount(0);

    await selectPlan(page, 'PRO');
    await page.goto('/app/settings');
    await page.locator('nav').getByRole('button', { name: 'Branding', exact: true }).click();
    await expect(page.getByLabel('Business logo URL')).toBeVisible();
  });
});