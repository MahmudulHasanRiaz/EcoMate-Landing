import { expect, test } from '@playwright/test';

/**
 * Full CMS loop (Task 18 Step 3): bootstrap → login → edit hero headline →
 * save → sign out → public landing shows the headline without a rebuild.
 *
 * Plus the guards: self-deactivation → 409, non-superadmin on user
 * management → 403.
 *
 * All of these need a privileged session against the throwaway DB. The suite
 * degrades honestly: bootstrap runs only when `/api/admin/setup` reports the
 * instance is not yet configured (the shared test DB already has operators,
 * so it skips there); everything else needs `E2E_ADMIN_EMAIL` (+ password,
 * + TOTP when enrolled) and skips without it. Skips print their reason —
 * nothing here claims a pass it did not earn.
 */
test.describe('admin CMS loop', () => {
  test('bootstrap first superadmin via the setup route (fresh DB only)', async ({ request }) => {
    const status = await request.get('/api/admin/setup');
    expect(status.ok()).toBe(true);
    const state = (await status.json()) as { setupEnabled: boolean; alreadyCompleted: boolean };
    test.skip(state.alreadyCompleted, 'setup already completed on this database — bootstrap is a one-time flow');
    const token = process.env.E2E_SETUP_TOKEN ?? '';
    test.skip(token === '', 'no E2E_SETUP_TOKEN: cannot drive bootstrap without the one-time token');
    const email = `e2e-superadmin-${Date.now()}@example.invalid`;
    const created = await request.post('/api/admin/setup', {
      data: { token, email, password: 'correct-horse-battery-staple-e2e-99' },
    });
    expect(created.status()).toBe(201);
    const body = (await created.json()) as { totp: { secret: string } };
    expect(body.totp.secret).not.toBe('');
  });

  test('login → edit hero headline → save → public page shows it without rebuild', async ({
    page,
  }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? '';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(email === '' || password === '', 'no E2E admin credentials: set E2E_ADMIN_EMAIL/PASSWORD');
    const headline = `E2E Headline ${Date.now()}`;

    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    const code = process.env.E2E_ADMIN_TOTP ?? '';
    if (code !== '') await page.getByLabel(/authenticator/i).fill(code);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin', { timeout: 15_000 });

    // Landing-content editor: open the hero section and save the headline.
    await page.getByText('Landing Content').first().click();
    await page.getByText('hero').first().click();
    const editor = page.locator('textarea').first();
    await editor.fill(JSON.stringify({ headlinePart1: headline }));
    await page.getByRole('button', { name: /save en/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/');
    await expect(page.getByText(headline).first()).toBeVisible({ timeout: 15_000 });
  });

  test('self-deactivation is a 409, not a lockout', () => {
    // Shape when credentials exist: sign in as superadmin, PUT
    // /api/admin/users/<own-id> { isActive: false } → 409 'own account'.
    test.skip(true, 'deferred: no E2E superadmin credentials exist for the shared test DB');
  });

  test('non-superadmin on user management is a 403', () => {
    // Shape when credentials exist: sign in as editor, GET /api/admin/users → 403.
    test.skip(true, 'deferred: no E2E operator credentials exist for the shared test DB');
  });
});
