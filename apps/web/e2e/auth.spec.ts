import { test, expect } from '@playwright/test';
import { registerUser, loginUser, logout } from './helpers';

test.describe('auth flows', () => {
  test('redirects anonymous users away from the app shell', async ({ page }) => {
    for (const path of ['/app/dashboard', '/app/invoices', '/app/customers']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    }
  });

  test('registers a new account and lands on the dashboard', async ({ page }) => {
    await registerUser(page, 'Curious Fox Studio');
    await expect(page.getByRole('heading', { name: 'Good morning, Curious' })).toBeVisible();
    await expect(page.getByText('Curious Fox Studio')).toBeVisible();
  });

  test('logs out and logs back in', async ({ page }) => {
    const user = await registerUser(page, 'Round Trip Studio');
    await logout(page);
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    await loginUser(page, user);
    await expect(page.getByRole('heading', { name: 'Good morning, Round' })).toBeVisible();
    await expect(page.getByText('Round Trip Studio')).toBeVisible();
  });
});
