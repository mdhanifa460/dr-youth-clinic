import { test, expect } from '@playwright/test';

// Claims the clinic has no evidence for must not reach a patient, even if they are
// typed back into Admin. Checks what is visible, plus metadata and structured data.
const BANNED = [
  /\bFDA\b/i, /board[-\s]certified/i, /certified dermatolog/i, /\bNABH\b/, /\bIADVL\b/,
  /best aesthetic clinic/i, /10k\+/i, /trusted by thousands/i, /painless/i, /up to 50%/i, /limited[-\s]time/i,
];
const PAGES = ['/', '/about', '/doctors', '/book', '/faqs', '/offers', '/chennai', '/chennai/services'];

for (const path of PAGES) {
  test(`${path} has no unsupported claims, one main landmark and one h1`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    const head = await page.evaluate(() => [
      document.title,
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      ...Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent || ''),
    ].join(' '));
    for (const pattern of BANNED) {
      expect(text, `${pattern} in page text`).not.toMatch(pattern);
      expect(head, `${pattern} in metadata`).not.toMatch(pattern);
    }
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('no phone link contains spaces', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="tel:"]').evaluateAll((els) => els.map((e) => e.getAttribute('href') || ''));
  for (const href of hrefs) expect(href).not.toMatch(/\s/);
});

test('no location prompt on page load', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__geoCalls = 0;
    navigator.geolocation.getCurrentPosition = () => { (window as any).__geoCalls++; };
  });
  await page.goto('/');
  await page.waitForLoadState('load');
  expect(await page.evaluate(() => (window as any).__geoCalls)).toBe(0);
});

test('city schema carries the hours shown for that branch', async ({ page }) => {
  await page.goto('/bangalore');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const clinic = blocks.map((b) => JSON.parse(b)).find((b) => b.name === 'DR Youth Clinic - Bangalore');
  expect(clinic.address.addressRegion).toBe('Karnataka');
  expect(clinic.openingHoursSpecification[0].opens).toBe('10:00');
  expect(clinic.aggregateRating).toBeUndefined();
});

test('the appointment lookup page stays out of search', async ({ page }) => {
  await page.goto('/my-appointments');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
