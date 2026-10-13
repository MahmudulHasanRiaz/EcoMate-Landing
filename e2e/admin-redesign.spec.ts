import { expect, test } from '@playwright/test';

test.describe('admin redesign smoke', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? '';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(email === '' || password === '', 'no E2E admin credentials');
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    const code = process.env.E2E_ADMIN_TOTP ?? '';
    if (code !== '') await page.getByLabel(/authenticator/i).fill(code);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin', { timeout: 15_000 });
  });

  test('studio shell renders nav, widget, topbar', async ({ page }) => {
    await page.goto('/admin/cms?tab=dashboard');
    // H1 is the implemented DashboardTab heading; "Dashboard Overview" is the
    // sidebar nav item + topbar breadcrumb (AdminPanel NAV_GROUPS / AdminShell).
    await expect(page.getByRole('heading', { name: /operations & marketing hub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dashboard overview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /systems/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('theme toggle flips the document class', async ({ page }) => {
    await page.goto('/admin/cms?tab=dashboard');
    const toggle = page.getByTitle(/toggle theme/i);
    await expect(toggle).toBeVisible();
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await toggle.click();
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(after).toBe(!before);
  });

  test('purge buttons open confirm dialogs', async ({ page }) => {
    await page.goto('/admin/cms?tab=settings');
    await page.getByRole('button', { name: /purge all cache/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/purge all caches\?/i)).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-purge-dialog.png' });
  });

  test('lead drawer opens from leads tab', async ({ page }) => {
    await page.goto('/admin/cms?tab=leads');
    await expect(page.getByRole('heading', { name: /inbound lead pipeline/i })).toBeVisible();
    const historyButtons = page.getByRole('button', { name: /^history for /i });
    if ((await historyButtons.count()) === 0) {
      test.skip(true, 'no leads in the test database — drawer has nothing to open');
    }
    await historyButtons.first().click();
    await expect(page.getByRole('dialog', { name: /details and follow-up/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-leads.png' });
  });
});
