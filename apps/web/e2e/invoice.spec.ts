import { test, expect } from '@playwright/test';
import { registerUser, addCustomer, getFirstInvoiceToken, totalValue } from './helpers';

test.describe('invoice happy path', () => {
  test('creates a customer, invoices them, and opens their payment page', async ({ page }) => {
    await registerUser(page, 'Invoice Studio');

    await addCustomer(page, {
      name: 'Acme Interiors',
      email: 'accounts@acme.in',
      phone: '+91 98765 43210',
      company: 'Acme Interiors Pvt. Ltd.',
    });

    await page.goto('/app/invoices/new');
    await expect(page.getByLabel('Customer')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Customer').selectOption({ index: 1 });

    const itemRow = page.locator('form table tbody tr').first();
    await itemRow.getByPlaceholder('Website development').fill('Website design');
    await itemRow.locator('input[type="number"]').nth(0).fill('1');
    await itemRow.locator('input[type="number"]').nth(1).fill('25000');

    await page.getByRole('button', { name: 'Create Invoice' }).click();
    await expect(page).toHaveURL(/\/app\/invoices$/, { timeout: 20_000 });
    await expect(page.getByText('INV-001')).toBeVisible();

    const row = page.locator('tbody tr').filter({ hasText: 'INV-001' });
    await expect(row.getByRole('cell', { name: 'Acme Interiors', exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Send' }).click();
    await expect(row.getByText('sent')).toBeVisible({ timeout: 15_000 });

    const token = await getFirstInvoiceToken(page);
    await page.goto(`/pay/${token}`);
    await expect(page.getByText('Website design')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'INV-001' })).toBeVisible();
    await expect(totalValue(page)).toHaveText('₹25,000.00');
    await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible();
  });
});
