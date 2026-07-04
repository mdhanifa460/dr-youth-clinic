import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and shows clinic name in title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DR Youth Clinic/i);
  });

  test('navigation links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /services/i }).first()).toBeVisible();
  });

  test('FAQ section renders questions', async ({ page }) => {
    await page.goto('/');
    const faqSection = page.locator('section').filter({ hasText: /frequently asked/i });
    await expect(faqSection).toBeVisible();
  });

  test('"View all FAQs" links to /faqs', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /view all faqs/i });
    await expect(link).toHaveAttribute('href', '/faqs');
  });

  test('Book button is present and clickable', async ({ page }) => {
    await page.goto('/');
    const bookBtn = page.getByRole('link', { name: /book/i }).first();
    await expect(bookBtn).toBeVisible();
  });

  test('page has no broken meta description', async ({ page }) => {
    await page.goto('/');
    const metaDesc = page.locator('meta[name="description"]');
    const content = await metaDesc.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });
});
