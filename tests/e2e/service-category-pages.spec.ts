import { test, expect } from '@playwright/test';

// Regression coverage for a real production incident: every single
// /[city]/services/[category] page — every city, every category, no
// exceptions — 500'd (or, inconsistently, rendered as a wrongly-200'd 404
// page) from 2026-08-17 until the fix, because this route combines
// generateStaticParams()+revalidate (a static-rendering contract) with a
// shared-layout component (Footer.tsx) that called headers()/cookies()
// unconditionally. seo.spec.ts's existing PAGES list never included a
// single /[city]/services/[category] URL, so a fully broken, sitewide,
// four-day-long outage on this entire route shape passed CI green the
// whole time. This sweeps the full city × category matrix specifically
// so that gap can't repeat — if anyone reintroduces an unguarded
// headers()/cookies() call anywhere in the shared public layout tree
// (Footer, TopBar, Navbar, MobileStickyBar, or a new addition), or in
// app/not-found.tsx without force-dynamic, this fails loudly in CI
// before it ever reaches production again.
const CITIES = ['chennai', 'bangalore', 'coimbatore', 'kochi'];
// Labels match DEFAULT_CATEGORIES (app/models/Category.ts) exactly — "other"'s
// real admin-configured label is "Specialist Care", not the literal slug.
const CATEGORIES = [
  { slug: 'hair', label: 'Hair' },
  { slug: 'skin', label: 'Skin' },
  { slug: 'laser', label: 'Laser' },
  { slug: 'other', label: 'Specialist Care' },
];

for (const city of CITIES) {
  for (const { slug, label } of CATEGORIES) {
    test(`/${city}/services/${slug} — loads as a real category page, not an error`, async ({ page }) => {
      const response = await page.goto(`/${city}/services/${slug}`);
      // The exact incident this guards: DYNAMIC_SERVER_USAGE crashed some
      // requests with a raw 500 and others with a 404-styled page wrongly
      // served as 200 — asserting both the status AND the content rules
      // out either failure mode, not just one.
      expect(response!.status(), `${city}/services/${slug} should return 200, not an error status`).toBe(200);
      await expect(page.locator('h1, h2').filter({ hasText: 'Page Not Found' })).toHaveCount(0);
      await expect(page).toHaveTitle(new RegExp(label, 'i'));
    });
  }
}

// A category with genuinely zero services configured for a given city is a
// real, valid content state (see page.tsx's "treatments coming soon" empty
// state) — distinct from the crash this file guards against. Confirms the
// page itself still renders successfully (200, no crash) even in that case,
// rather than accidentally asserting every combo must have real inventory.
test('a services category page with no services for this city still renders successfully, not an error', async ({ page }) => {
  const response = await page.goto('/coimbatore/services/laser');
  expect(response!.status()).toBe(200);
  await expect(page.locator('h1, h2').filter({ hasText: 'Page Not Found' })).toHaveCount(0);
});
