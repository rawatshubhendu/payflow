import { test, expect } from '@playwright/test';
import { registerUser, addCustomer, loginUser, logout, selectPlan } from './helpers';

const NEW_PASSWORD = 'E2ePassw0rd#2';

function tab(page: import('@playwright/test').Page, name: string): import('@playwright/test').Locator {
  return page.locator('nav').getByRole('button', { name, exact: true });
}

test.describe('app settings', () => {
  test('every tab is functional, not a placeholder', async ({ page }) => {
    await registerUser(page, 'Settings Studio');
    await page.goto('/app/settings');

    for (const name of ['Business profile', 'Payments', 'Branding', 'Invoice defaults', 'Notifications', 'Security', 'Billing']) {
      await tab(page, name).click();
      await expect(page.getByText(/upcoming slices/)).toHaveCount(0);
      if (name !== 'Payments') {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
    }
  });

  test('saves invoice defaults and pre-fills the invoice form', async ({ page }) => {
    await registerUser(page, 'Defaults Studio');
    await addCustomer(page, { name: 'Invoice Recipient', email: 'recipient@acme.in' });
    await page.goto('/app/settings');

    await tab(page, 'Invoice defaults').click();
    await page.getByLabel('Default tax rate (%)').fill('12');
    await page.getByLabel('Default tax type').selectOption('IGST');
    await page.getByRole('button', { name: 'Save defaults' }).click();
    await expect(page.getByText('Invoice defaults saved')).toBeVisible();

    await page.goto('/app/invoices/new');
    await expect(page.getByLabel('Customer')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('Tax rate (%)')).toHaveValue('12');
    await expect(page.getByLabel('Tax type')).toHaveValue('IGST');
  });

  test('saves branding and updates notification preferences', async ({ page }) => {
    await registerUser(page, 'Brand Studio');
    await selectPlan(page, 'PRO');
    await page.goto('/app/settings');

    await tab(page, 'Branding').click();
    await page.getByLabel('Business logo URL').fill('https://example.com/logo.png');
    await page.getByRole('button', { name: 'Save branding' }).click();
    await expect(page.getByText('Branding saved')).toBeVisible();

    await tab(page, 'Notifications').click();
    const paymentReceivedToggle = page
      .locator('label', { hasText: 'When I get paid' })
      .getByRole('checkbox');
    await paymentReceivedToggle.click();
    await expect(page.getByText('Notification preferences updated.')).toBeVisible();
    await expect(paymentReceivedToggle).not.toBeChecked();
  });

  test('changes the account password', async ({ page }) => {
    const user = await registerUser(page, 'Secure Studio');
    await page.goto('/app/settings');

    await tab(page, 'Security').click();
    await page.getByLabel('Current password', { exact: true }).fill(user.password);
    await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel('Confirm new password', { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByText('Password updated successfully.')).toBeVisible();

    await logout(page);
    user.password = NEW_PASSWORD;
    await loginUser(page, user);
  });
});