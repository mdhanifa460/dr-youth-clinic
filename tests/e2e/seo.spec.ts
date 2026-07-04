import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', minTitle: 'DR Youth Clinic' },
  { path: '/about', minTitle: 'About' },
  { path: '/blog', minTitle: 'Blog' },
  { path: '/doctors', minTitle: 'Doctor' },
  { path: '/faqs', minTitle: 'FAQ' },
  { path: '/offers', minTitle: 'Offer' },
];

for (const { path, minTitle } of PAGES) {
  test(`${path} — has title containing "${minTitle}"`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(new RegExp(minTitle, 'i'));
  });

  test(`${path} — has meta description`, async ({ page }) => {
    await page.goto(path);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(20);
  });

  test(`${path} — has canonical tag`, async ({ page }) => {
    await page.goto(path);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain(path === '/' ? '' : path);
  });
}

test('robots.txt disallows /admin', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  const body = await response!.text();
  expect(body).toContain('Disallow: /admin');
});

test('sitemap.xml is accessible', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  expect(response!.status()).toBe(200);
  const body = await response!.text();
  expect(body).toContain('<urlset');
  expect(body).toContain('/faqs');
});
