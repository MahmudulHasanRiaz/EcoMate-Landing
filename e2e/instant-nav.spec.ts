import { expect, test } from '@playwright/test';
import { instant } from '@next/playwright';

/**
 * Instant-navigation regression suite (Task 24).
 *
 * Baseline: green with `partialPrefetching` ABSENT (legacy full-prefetch —
 * every `<Link>` prefetched the complete cached render). Post-flag, default
 * links prefetch only the App Shell, and locale content is URL data
 * (`params.locale` read at the top of `app/[locale]/layout.tsx`), so it
 * streams in after navigation. Two baseline assertions were adapted to that
 * documented contract — see `instant-nav.rig.md` §CONTRACTS for the evidence
 * (warm 200 prefetches yet no instant commit into `[locale]` from outside).
 *
 * Shell reality (Task 23 deviation): the prefetched shared shell is the
 * locale provider + `app/[locale]/layout.tsx`, NOT the visual Header/Footer
 * (those render in page-level `LandingShell` by design, so blog/legal pages
 * stay minimal-chrome). Assertions lock layout/provider persistence
 * (document language, locale content, no full-reload flash) — not visual
 * stasis of chrome.
 *
 * Audit result: zero effective `prefetch={true}` links in app source (all
 * `<Link>` use the default; footer locale pages use plain `<a>`; the locale
 * switcher is client-state `toggleLocale`, not a navigation). No legacy
 * full-prefetch contract exists, so there is no per-link restoration to do —
 * this suite locks the App Shell default across the real navigations.
 */
test.describe('instant navigation (App Shell preservation)', () => {
  test('not-found → / lands the URL-data-free shell instantly', async ({ page }) => {
    // `/` reads no `params` (DEFAULT_LOCALE const), so its shell carries the
    // cached hero and commits under the instant lock.
    await page.goto('/e2e-missing-page-xyz');
    await expect(page.getByText('This address does not exist')).toBeVisible();

    // No full-document reload during the client navigation: mark the document
    // and confirm the same document object survives the click.
    await page.evaluate(() => {
      (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark = true;
    });

    await instant(page, async () => {
      await page.getByRole('link', { name: 'Back to home' }).click();
      await page.waitForURL('/', { timeout: 15_000 });
      await expect(page.getByText('E-commerce Operation').first()).toBeVisible();
    });

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const markSurvived = await page.evaluate(
      () => (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark === true,
    );
    expect(markSurvived).toBe(true);
  });

  test('/en/privacy → / lands the cached shell instantly', async ({ page }) => {
    await page.goto('/en/privacy');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.evaluate(() => {
      (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark = true;
    });

    await instant(page, async () => {
      await page.getByRole('link', { name: 'Home' }).first().click();
      await page.waitForURL('/', { timeout: 15_000 });
      await expect(page.getByText('E-commerce Operation').first()).toBeVisible();
    });

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const markSurvived = await page.evaluate(
      () => (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark === true,
    );
    expect(markSurvived).toBe(true);
  });

  test('/bn/privacy → /bn commits instantly; Bangla content streams after', async ({ page }) => {
    // Same `[locale]` layout, so the commit is instant (provider already
    // mounted). The hero copy is URL data (locale param), so it is asserted
    // AFTER the lock — inside the lock only the commit is asserted.
    await page.goto('/bn/privacy');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');

    await page.evaluate(() => {
      (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark = true;
    });

    await instant(page, async () => {
      await page.getByRole('link', { name: 'হোম' }).first().click();
      await page.waitForURL('/bn', { timeout: 15_000 });
      await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    });

    // Streamed URL-data lands once the lock releases.
    await expect(page.getByText('ই-কমার্স অপারেশন').first()).toBeVisible();
    const markSurvived = await page.evaluate(
      () => (window as unknown as { __e2eNavMark?: boolean }).__e2eNavMark === true,
    );
    expect(markSurvived).toBe(true);
  });

  test('cross-layout into locale routes still navigates (streaming contract)', async ({ page }) => {
    // `[locale]` layout reads `params` above any `<Suspense>`, so from outside
    // the layout there is no committable partial shell — the navigation
    // streams (no instant commit). This locks the real-user contract: the
    // links still land on the right locale with the right copy. No instant()
    // lock applies by construction, not by regression.
    for (const { link, url, lang, copy } of [
      { link: 'English home', url: '/en', lang: 'en', copy: 'E-commerce Operation' },
      { link: 'Bangla home', url: '/bn', lang: 'bn', copy: 'ই-কমার্স অপারেশন' },
    ] as const) {
      await page.goto('/e2e-missing-page-xyz');
      await page.getByRole('link', { name: link }).click();
      await page.waitForURL(url, { timeout: 15_000 });
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.getByText(copy).first()).toBeVisible();
    }
  });

  test('locale toggle preserves scroll position (existing behaviour, no navigation)', async ({
    page,
  }) => {
    // The switcher is client-state (`toggleLocale`), not a `<Link>` — no
    // `instant()` lock applies. This locks the existing scroll-anchor restore.
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await expect(page.locator('#pricing')).toBeInViewport();

    await page.getByRole('button', { name: /toggle language/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');

    const box = await page.locator('#pricing').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box?.y ?? 9999)).toBeLessThan(400);
  });
});
