import { expect, type Page } from '@playwright/test';

export const CATCHER_URL = 'http://127.0.0.1:8099';
export const API_ORIGIN = 'http://localhost:4001';

const PASSWORD = 'E2ePassw0rd!';

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@payflow.test`;
}

export function randomSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Polls the email catcher until an email for `email` with a 6-digit code
 * arrives, then returns the code.
 */
export async function getOtp(email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${CATCHER_URL}/api/messages`);
    const messages: Array<{ to?: string[]; html?: string }> = await response.json();
    const match = messages.find((message) => message.to?.includes(email));
    const code = match?.html?.match(/(\d{6})/)?.[1];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No verification code captured for ${email}`);
}

export interface RegisteredUser {
  email: string;
  password: string;
  businessName: string;
}

export async function registerUser(page: Page, displayName?: string): Promise<RegisteredUser> {
  const user: RegisteredUser = {
    email: uniqueEmail(),
    password: PASSWORD,
    businessName: displayName ?? `Acme Studio ${randomSuffix()}`,
  };

  await page.goto('/register');
  await page.getByLabel('Business / Agency Name').fill(user.businessName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Continue with verification' }).click();

  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();

  const otp = await getOtp(user.email);
  await page.getByPlaceholder('······').fill(otp);
  await page.getByRole('button', { name: 'Verify & Continue' }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });
  return user;
}

export async function loginUser(page: Page, user: RegisteredUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
}

export async function selectPlan(page: Page, plan: 'FREE' | 'PRO' | 'BUSINESS'): Promise<void> {
  const response = await page.request.post(`${API_ORIGIN}/api/subscription/select`, {
    data: { plan },
  });
  expect(response.ok()).toBeTruthy();
}

export async function addCustomer(
  page: Page,
  customer: { name: string; email?: string; phone?: string; company?: string },
): Promise<void> {
  await page.goto('/app/customers');
  await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
  await page.getByPlaceholder('e.g. Acme Interiors').fill(customer.name);
  if (customer.email) await page.getByPlaceholder('accounts@acme.in').fill(customer.email);
  if (customer.phone) await page.getByPlaceholder('+91 98XXXXXX12').fill(customer.phone);
  if (customer.company)
    await page.getByPlaceholder('Acme Interiors Pvt. Ltd.').fill(customer.company);
  await page.locator('form').getByRole('button', { name: 'Add Customer' }).click();
  await expect(page.getByText(customer.name, { exact: true })).toBeVisible();
}

export async function getFirstInvoiceToken(page: Page): Promise<string> {
  const response = await page.request.get(`${API_ORIGIN}/api/invoices`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data: Array<{ publicToken: string }> };
  expect(body.data.length).toBeGreaterThan(0);
  const first = body.data[0];
  expect(first).toBeDefined();
  return first!.publicToken;
}

export function totalValue(page: Page) {
  return page
    .locator('dl')
    .first()
    .locator('div')
    .filter({ hasText: /^Total/ })
    .getByRole('definition');
}

export interface CreatedInvoice {
  customerId: string;
  invoiceId: string;
  publicToken: string;
  invoiceNumber: string;
}

export async function createCustomerAndInvoice(
  page: Page,
  opts: { description?: string; amount?: number } = {},
): Promise<CreatedInvoice> {
  const description = opts.description ?? 'Website design';
  const amount = opts.amount ?? 25000;

  const customerResponse = await page.request.post(`${API_ORIGIN}/api/customers`, {
    data: {
      name: `API Customer ${randomSuffix()}`,
      email: `client-${randomSuffix()}@example.com`,
      company: 'Example Co.',
    },
  });
  expect(customerResponse.ok()).toBeTruthy();
  const customerBody = (await customerResponse.json()) as { data: { id: string } };

  const invoiceResponse = await page.request.post(`${API_ORIGIN}/api/invoices`, {
    data: {
      customerId: customerBody.data.id,
      items: [{ description, quantity: 1, unitPrice: amount }],
      discountAmount: 0,
      taxRate: 18,
      taxType: 'NONE',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    },
  });
  expect(invoiceResponse.ok()).toBeTruthy();
  const invoiceBody = (await invoiceResponse.json()) as {
    data: { id: string; publicToken: string; invoiceNumber: string };
  };

  const sendResponse = await page.request.post(
    `${API_ORIGIN}/api/invoices/${invoiceBody.data.id}/send`,
  );
  expect(sendResponse.ok()).toBeTruthy();

  return {
    customerId: customerBody.data.id,
    invoiceId: invoiceBody.data.id,
    publicToken: invoiceBody.data.publicToken,
    invoiceNumber: invoiceBody.data.invoiceNumber,
  };
}
