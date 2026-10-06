import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility gate (Task 18 Step 4): zero critical/serious axe violations
 * as a BLOCKING assertion on every surface below, plus reduced-motion,
 * control-labelling and keyboard-focus proof.
 */
test.describe('accessibility gate', () => {
  async function criticalOrSerious(page: import('@playwright/test').Page) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    return results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );
  }

  test('landing page: zero critical/serious violations', async ({ page }) => {
    await page.goto('/');
    expect(await criticalOrSerious(page)).toEqual([]);
  });

  test('landing page in dark mode: zero critical/serious violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /toggle theme/i }).first().click();
    await expect(page.locator('html.dark')).toHaveCount(1);
    expect(await criticalOrSerious(page)).toEqual([]);
  });

  test('admin login: zero critical/serious violations', async ({ page }) => {
    await page.goto('/admin/login');
    expect(await criticalOrSerious(page)).toEqual([]);
  });

  test('admin dashboard: zero critical/serious violations', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? '';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(email === '' || password === '', 'no E2E admin credentials: set E2E_ADMIN_EMAIL/PASSWORD');
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin', { timeout: 15_000 });
    expect(await criticalOrSerious(page)).toEqual([]);
  });

  test('lead form at 360px: zero critical/serious violations', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.locator('#lead-form').scrollIntoViewIfNeeded();
    expect(await criticalOrSerious(page)).toEqual([]);
  });

  test('prefers-reduced-motion is honoured (no infinite CSS animation)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const matches = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    expect(matches).toBe(true);
    const infinite = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const el of document.querySelectorAll('*')) {
        const style = getComputedStyle(el);
        if (
          style.animationName !== 'none' &&
          style.animationIterationCount === 'infinite' &&
          style.animationDuration !== '0s'
        ) {
          offenders.push(`${el.tagName}.${el.className.toString().slice(0, 40)}`);
        }
      }
      return offenders;
    });
    expect(infinite).toEqual([]);
  });

  test('every lead-form control has an accessible label', async ({ page }) => {
    await page.goto('/');
    const unlabeled = await page.locator('#lead-form').evaluate((section) => {
      const bad: string[] = [];
      for (const el of section.querySelectorAll('input, select, textarea')) {
        const control = el as HTMLInputElement;
        const named =
          (control.labels?.length ?? 0) > 0 ||
          el.getAttribute('aria-label') !== null ||
          el.getAttribute('aria-labelledby') !== null;
        if (!named) bad.push(el.outerHTML.slice(0, 80));
      }
      return bad;
    });
    expect(unlabeled).toEqual([]);
  });

  test('keyboard-only traversal reaches the lead form with visible focus', async ({ page }) => {
    await page.goto('/');
    // Start at the hero CTA and walk forward with the keyboard.
    const heroCta = page.getByRole('link', { name: /book a free demo/i }).first();
    await heroCta.focus();
    let reached = false;
    for (let i = 0; i < 60; i++) {
      const inForm = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLElement && active.closest('#lead-form') !== null;
      });
      if (inForm) {
        reached = true;
        break;
      }
      await page.keyboard.press('Tab');
    }
    expect(reached).toBe(true);
    const focusVisible = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return false;
      const style = getComputedStyle(active);
      return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
    });
    expect(focusVisible).toBe(true);
  });
});
