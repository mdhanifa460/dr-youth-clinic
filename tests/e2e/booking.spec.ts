import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/book');
  });

  test('booking page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/book/i);
  });

  test('shows step 1 — personal info', async ({ page }) => {
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible();
  });

  test('cannot proceed without filling personal info', async ({ page }) => {
    const continueBtn = page.getByRole('button', { name: /continue/i }).first();
    await continueBtn.click();
    await expect(page.getByText(/enter your name/i)).toBeVisible();
  });

  test('completing personal info advances to service step', async ({ page }) => {
    await page.getByPlaceholder('Full Name *').fill('Test User');
    await page.getByPlaceholder('Phone Number *').fill('9876543210');
    await page.getByPlaceholder(/describe your skin/i).fill('Acne concern');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await expect(page.getByText(/what are you looking for/i)).toBeVisible();
  });

  test('selecting a service enables next step', async ({ page }) => {
    await page.getByPlaceholder('Full Name *').fill('Test User');
    await page.getByPlaceholder('Phone Number *').fill('9876543210');
    await page.getByPlaceholder(/describe your skin/i).fill('Acne concern');
    await page.getByRole('button', { name: /continue/i }).first().click();

    const firstService = page.locator('button').filter({ hasText: /laser|skin|hair/i }).first();
    await firstService.click();
    const nextBtn = page.getByRole('button', { name: /continue/i }).first();
    await nextBtn.click();
    // Should advance to step 3 — location
    await expect(page.getByText(/choose your clinic/i)).toBeVisible();
  });

  test('shows location selection step', async ({ page }) => {
    await expect(page.getByText(/chennai|bangalore|kochi|coimbatore/i).first()).toBeVisible();
  });
});
