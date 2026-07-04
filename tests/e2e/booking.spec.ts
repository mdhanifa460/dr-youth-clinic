import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/book');
  });

  test('booking page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/book/i);
  });

  test('shows step 1 — service selection', async ({ page }) => {
    await expect(page.getByText(/choose your treatment/i)).toBeVisible();
  });

  test('cannot proceed without selecting a service', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    await nextBtn.click();
    await expect(page.getByText(/select a service/i)).toBeVisible();
  });

  test('selecting a service enables next step', async ({ page }) => {
    const firstService = page.locator('button').filter({ hasText: /laser|skin|hair/i }).first();
    await firstService.click();
    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    await nextBtn.click();
    // Should advance to step 2
    await expect(page.getByText(/select.*date|when.*appointment/i)).toBeVisible();
  });

  test('shows location selection step', async ({ page }) => {
    await expect(page.getByText(/chennai|bangalore|kochi|coimbatore/i).first()).toBeVisible();
  });
});
