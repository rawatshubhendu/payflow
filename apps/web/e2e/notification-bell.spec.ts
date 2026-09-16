import { test, expect } from '@playwright/test';
import { registerUser, createCustomerAndInvoice, selectPlan } from './helpers';

test.describe('notification bell', () => {
  test('shows a badge and dropdown of notifications after sending an invoice', async ({ page }) => {
    await registerUser(page, 'Bell Studio');
    await createCustomerAndInvoice(page, { description: 'Brand design', amount: 15000 });

    // Free plan is fine; sending an invoice creates an INVOICE_SENT notification.
    await page.goto('/app/dashboard');

    const bell = page.getByRole('button', { name: 'Notifications' });
    await expect(bell).toBeVisible();
    await expect(bell).toContainText('1', { timeout: 15_000 });

    await bell.click();
    await expect(page.getByText('Invoice sent').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Invoice .* sent to/).first()).toBeVisible();
    await expect(page.getByText('Mark all read')).toBeVisible();

    await page.getByRole('button', { name: 'Mark all read' }).click();
    await expect(bell).not.toContainText('1', { timeout: 10_000 });
  });
});