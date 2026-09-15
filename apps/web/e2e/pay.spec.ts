import { test, expect } from '@playwright/test';
import { registerUser, createCustomerAndInvoice, totalValue } from './helpers';

test.describe('public payment page', () => {
  test('shows an error for an unknown token', async ({ page }) => {
    await page.goto('/pay/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Invoice not available' })).toBeVisible();
  });

  test('renders a live invoice and its pay button', async ({ page }) => {
    await registerUser(page, 'Pay Page Studio');
    const { publicToken } = await createCustomerAndInvoice(page, {
      description: 'Brand identity',
      amount: 12500,
    });

    await page.goto(`/pay/${publicToken}`);
    await expect(page.getByText('Brand identity')).toBeVisible();
    await expect(totalValue(page)).toHaveText('₹12,500.00');
    await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible();
  });
});
