import { test, expect } from '@playwright/test';

test.describe('Privacy Policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy-policy');
  });

  test('stays at its URL with a canonical, one h1, and one main landmark', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy-policy$/);
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('overview cards link to sections that exist', async ({ page }) => {
    const cards = page.getByRole('region', { name: 'At a glance' }).getByRole('link');
    await expect(cards).toHaveCount(4);
    for (const href of await cards.evaluateAll((els) => els.map((e) => e.getAttribute('href') || ''))) {
      await expect(page.locator(href)).toBeVisible();
    }
  });

  test('explains how to make a request, with a working email link', async ({ page }) => {
    const panel = page.getByRole('region', { name: /how to make a privacy request/i });
    await expect(panel.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/);
  });

  test('never shows unresolved draft text', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('[TO CONFIRM');
  });

  test('internal links are kept', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Terms of Service' }).first()).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: /book a consultation/i }).last()).toHaveAttribute('href', '/book');
  });
});
