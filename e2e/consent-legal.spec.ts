import { expect, test } from '@playwright/test';

/**
 * Consent gate + legal pages (Task 20 §§5–6, read-only).
 *
 * No lead is submitted here: the running server may point at live data, so
 * this spec only reads. Data-layer suppression (fbp/fbc cleared, CAPI skipped
 * for opted-out visitors) is asserted at the code level in
 * `app/api/leads/route.ts` + `lib/leadDispatch.ts`.
 *
 * NOTE on pixel assertions: `NEXT_PUBLIC_META_PIXEL_ID` is unset in this
 * environment, so `window.fbq` is undefined regardless of choice. What IS
 * deterministic: no request to facebook ever fires, and the consent cookie
 * records the exact choice for 12 months of return visits.
 */
test.describe('consent gate', () => {
  test('banner shows until a choice is made', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: /privacy/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /accept all/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /essential only/i })).toBeVisible();
  });

  test('Essential only: cookie records it, no facebook request fires', async ({ page }) => {
    const facebook: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('facebook')) facebook.push(request.url());
    });
    await page.goto('/');
    await page.getByRole('button', { name: /essential only/i }).click();
    await expect(page.getByRole('dialog', { name: /privacy/i })).toBeHidden();
    const cookies = await page.context().cookies();
    const consent = cookies.find((cookie) => cookie.name === 'ecomate_consent');
    expect(consent).toBeDefined();
    expect(decodeURIComponent(consent?.value ?? '')).toContain('essential');
    // Pixel must never load for opted-out visitors.
    expect(await page.evaluate(() => typeof (window as { fbq?: unknown }).fbq)).toBe('undefined');
    await page.reload();
    await page.waitForTimeout(1500);
    expect(facebook).toEqual([]);
  });

  test('Accept all: cookie records it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /accept all/i }).click();
    await expect(page.getByRole('dialog', { name: /privacy/i })).toBeHidden();
    const cookies = await page.context().cookies();
    const consent = cookies.find((cookie) => cookie.name === 'ecomate_consent');
    expect(consent).toBeDefined();
    expect(decodeURIComponent(consent?.value ?? '')).toContain('accepted');
  });

  test('Escape dismisses to Essential-only', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /privacy/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /privacy/i })).toBeHidden();
    const cookies = await page.context().cookies();
    const consent = cookies.find((cookie) => cookie.name === 'ecomate_consent');
    expect(consent).toBeDefined();
    expect(decodeURIComponent(consent?.value ?? '')).toContain('essential');
  });
});

test.describe('legal pages', () => {
  for (const path of ['/en/privacy', '/bn/privacy', '/en/terms', '/bn/terms']) {
    test(`${path} renders with Article metadata`, async ({ page, request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      await page.goto(path);
      await expect(page.locator('article h1').first()).toBeVisible();
      const inLanguage = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(inLanguage.some((text) => text.includes('inLanguage'))).toBe(true);
    });
  }

  test('sitemap lists the legal pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    for (const path of ['/en/privacy', '/bn/privacy', '/en/terms', '/bn/terms']) {
      expect(xml).toContain(path);
    }
  });

  test('404 offers a human', async ({ page }) => {
    await page.goto('/no-such-page-xyz');
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
    const whatsapp = page.locator('a[href*="wa.me"]');
    await expect(whatsapp.first()).toBeVisible();
  });
});
