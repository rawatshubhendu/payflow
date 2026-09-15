import { test, expect } from '@playwright/test';

const MARKETING_PAGES = [
  { path: '/', heading: 'Get Paid. Without Chasing.' },
  { path: '/pricing', heading: 'Simple plans. No surprises.' },
  { path: '/features', heading: 'Everything to get paid, nothing you do not need.' },
  { path: '/security', heading: 'Money moves should feel safe.' },
  { path: '/contact', heading: 'Talk to a human' },
];

test.describe('marketing pages', () => {
  for (const page of MARKETING_PAGES) {
    test(`${page.path} renders`, async ({ page: p }) => {
      const response = await p.goto(page.path);
      expect(response?.status()).toBe(200);
      await expect(p.getByRole('heading', { name: page.heading, level: 1 })).toBeVisible();
    });
  }

  test('login and register pages render', async ({ page: p }) => {
    const login = await p.goto('/login');
    expect(login?.status()).toBe(200);
    await expect(p.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();

    const register = await p.goto('/register');
    expect(register?.status()).toBe(200);
    await expect(p.getByRole('heading', { name: 'Start collecting', level: 1 })).toBeVisible();
  });
});
