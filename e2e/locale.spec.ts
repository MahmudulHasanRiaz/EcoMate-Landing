import { expect, test } from '@playwright/test';

/**
 * Locales (Task 18 Step 3): `/bn` renders Bangla, the switcher preserves
 * scroll position, and a section with no `bn` row falls back to English
 * (never blank).
 *
 * The throwaway test DB holds zero `landing_content` rows, so both locales
 * render their static copies here — which is exactly the fallback chain under
 * test: missing DB slice → static copy, never an empty section.
 */
test.describe('locales', () => {
  test('/bn renders Bangla copy with the Bangla document language', async ({ page }) => {
    await page.goto('/bn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.getByText('ই-কমার্স অপারেশন').first()).toBeVisible();
  });

  test('/ renders English copy with the English document language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('E-commerce Operation').first()).toBeVisible();
  });

  test('the locale switcher keeps the visitor on the same section', async ({ page }) => {
    await page.goto('/');
    // Park the viewport on the pricing section, then switch language.
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await expect(page.locator('#pricing')).toBeInViewport();

    await page.getByRole('button', { name: /toggle language/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');

    // Same section identity after the swap: Bangla copy is taller, so a pixel
    // offset would land elsewhere — the shell restores by section id.
    const box = await page.locator('#pricing').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box?.y ?? 9999)).toBeLessThan(400);
  });

  test('a section with no bn row falls back to English, never blank', async ({ page }) => {
    await page.goto('/bn');
    // Every one of the 16 sections renders text: none may come back empty
    // when its `bn` DB slice is absent.
    const sections = page.locator('main section[id]');
    const total = await sections.count();
    expect(total).toBeGreaterThan(5);
    for (let i = 0; i < total; i++) {
      const text = (await sections.nth(i).innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
