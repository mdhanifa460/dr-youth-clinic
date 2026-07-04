import { test, expect } from '@playwright/test';

// Visual regression tests — run with: npm run test:visual
// On first run, snapshots are created. Subsequent runs compare against them.
// Update snapshots with: npx playwright test tests/e2e/visual.spec.ts --update-snapshots

test.describe('Visual regression — desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('homepage hero section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Mask dynamic content that changes between runs
    await expect(page).toHaveScreenshot('homepage-hero.png', {
      clip: { x: 0, y: 0, width: 1280, height: 700 },
      mask: [page.locator('video'), page.locator('[data-testid="countdown"]')],
      maxDiffPixelRatio: 0.02,
    });
  });

  test('homepage full page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      mask: [
        page.locator('video'),
        page.locator('img[src*="cloudinary"]'),
      ],
      maxDiffPixelRatio: 0.03,
    });
  });

  test('FAQ page', async ({ page }) => {
    await page.goto('/faqs');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('faqs-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('FAQ accordion open state', async ({ page }) => {
    await page.goto('/faqs');
    await page.waitForLoadState('networkidle');
    // Open first accordion item
    const firstQuestion = page.locator('button').filter({ hasText: /\?/ }).first();
    await firstQuestion.click();
    await page.waitForTimeout(300); // wait for animation
    await expect(page).toHaveScreenshot('faqs-accordion-open.png', {
      clip: { x: 0, y: 0, width: 1280, height: 900 },
      maxDiffPixelRatio: 0.02,
    });
  });

  test('booking page', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('about page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('about-page.png', {
      fullPage: true,
      mask: [page.locator('img[src*="cloudinary"]')],
      maxDiffPixelRatio: 0.03,
    });
  });

  test('blog listing page', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('blog-page.png', {
      fullPage: true,
      mask: [page.locator('img')],
      maxDiffPixelRatio: 0.03,
    });
  });

  test('offers page', async ({ page }) => {
    await page.goto('/offers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('offers-page.png', {
      fullPage: true,
      mask: [page.locator('img')],
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('Visual regression — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test('homepage mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      mask: [
        page.locator('video'),
        page.locator('img[src*="cloudinary"]'),
      ],
      maxDiffPixelRatio: 0.03,
    });
  });

  test('FAQ page mobile', async ({ page }) => {
    await page.goto('/faqs');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('faqs-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('booking page mobile', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('navigation menu opens on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Open hamburger menu
    const menuBtn = page.getByRole('button', { name: /menu|hamburger/i }).first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveScreenshot('mobile-nav-open.png', {
      clip: { x: 0, y: 0, width: 390, height: 844 },
      maxDiffPixelRatio: 0.02,
    });
  });
});
