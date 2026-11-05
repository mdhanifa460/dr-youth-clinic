import { test, expect, type Page } from '@playwright/test';

async function completeStepOne(page: Page) {
  await page.getByRole('button', { name: /skin & aesthetics/i }).click();
  await page.getByRole('button', { name: /^bangalore$/i }).click();
  await page.getByRole('button', { name: /continue/i }).click();
}

// The next Monday at least two days away, so it is never today and never a Sunday.
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA');
}

async function completeStepTwo(page: Page) {
  await page.getByLabel(/preferred date/i).fill(nextMonday());
  await page.getByRole('button', { name: '10:00 AM' }).click();
  await page.getByRole('button', { name: /continue/i }).click();
}

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/book');
  });

  test('booking page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/book/i);
  });

  test('starts with treatment and clinic', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /what can we help with/i })).toBeVisible();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
  });

  test('cannot continue without a choice', async ({ page }) => {
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /choose what you need/i })).toBeVisible();
  });

  test('time slots follow the chosen branch hours', async ({ page }) => {
    await completeStepOne(page);
    await page.getByLabel(/preferred date/i).fill(nextMonday());
    await expect(page.getByRole('button', { name: '10:00 AM' })).toBeVisible();
    // Bangalore opens at 10 and closes at 6.
    await expect(page.getByRole('button', { name: '09:00 AM' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '06:00 PM' })).toHaveCount(0);
  });

  test('rejects an invalid mobile number', async ({ page }) => {
    await completeStepOne(page);
    await completeStepTwo(page);
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/mobile number/i).fill('12345');
    await page.getByRole('button', { name: /request appointment/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /valid 10-digit/i })).toBeVisible();
  });

  test('shows a clear error when the request fails, and keeps the details', async ({ page }) => {
    await page.route('**/api/booking', (route) => route.fulfill({ status: 500, json: { success: false } }));
    await completeStepOne(page);
    await completeStepTwo(page);
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/mobile number/i).fill('9876543210');
    await page.getByRole('button', { name: /request appointment/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /could not send/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toHaveValue('Test User');
  });

  test('asks to request, never to confirm, and links the privacy policy', async ({ page }) => {
    await completeStepOne(page);
    await completeStepTwo(page);
    await expect(page.getByRole('button', { name: /confirm booking/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible();
  });
});
