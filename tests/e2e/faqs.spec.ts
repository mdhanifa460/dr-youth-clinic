import { test, expect } from '@playwright/test';

test.describe('FAQ page', () => {
  test('loads at /faqs', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page).toHaveTitle(/FAQ/i);
  });

  test('shows hero search bar', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.getByPlaceholder(/search questions/i)).toBeVisible();
  });

  test('search filters questions', async ({ page }) => {
    await page.goto('/faqs');
    await page.getByPlaceholder(/search questions/i).fill('laser');
    await expect(page.getByText(/\d+ results? for/i)).toBeVisible();
  });

  test('clear search restores all questions', async ({ page }) => {
    await page.goto('/faqs');
    await page.getByPlaceholder(/search questions/i).fill('laser');
    await page.getByRole('button', { name: /clear/i }).click();
    await expect(page.getByPlaceholder(/search questions/i)).toHaveValue('');
  });

  test('category tabs are visible', async ({ page }) => {
    await page.goto('/faqs');
    const tabs = page.getByTestId('faq-category-tabs');
    await expect(tabs.getByRole('button', { name: /general/i })).toBeVisible();
    await expect(tabs.getByRole('button', { name: /skin/i })).toBeVisible();
    await expect(tabs.getByRole('button', { name: /hair/i })).toBeVisible();
    await expect(tabs.getByRole('button', { name: /laser/i })).toBeVisible();
  });

  test('clicking a category filters the FAQ list', async ({ page }) => {
    await page.goto('/faqs');
    await page.getByTestId('faq-category-tabs').getByRole('button', { name: /pricing/i }).click();
    await expect(page.getByText(/pricing/i).first()).toBeVisible();
  });

  test('accordion opens on click', async ({ page }) => {
    await page.goto('/faqs');
    const firstQuestion = page.locator('button').filter({ hasText: /\?/ }).first();
    await firstQuestion.click();
    // answer text should become visible
    const answer = page.locator('.border-t').first();
    await expect(answer).toBeVisible();
  });

  test('CTA block has booking link', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.getByRole('link', { name: /book free consultation/i })).toBeVisible();
  });

  test('has FAQ structured data in page', async ({ page }) => {
    await page.goto('/faqs');
    // The page also renders an OrganizationSchema ld+json script (from the
    // shared layout) ahead of this one in DOM order, so check all of them.
    const scripts = page.locator('script[type="application/ld+json"]');
    const contents = await scripts.allTextContents();
    expect(contents.some((c) => c.includes('FAQPage'))).toBe(true);
  });
});
