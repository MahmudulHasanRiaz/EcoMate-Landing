import { expect, test } from '@playwright/test';
import { countLeadsByPhonePrefix, deleteLeadsByPhonePrefix, E2E_TOKEN, probePhone } from './helpers/e2eDb';

/**
 * Money path: lead capture (Task 18 Step 3).
 *
 * Requires the documented E2E preview env: `E2E_TEST_MODE=1`,
 * `TURNSTILE_SECRET_KEY` set (any value — the bypass skips siteverify before
 * it is read), and the preview pointed at the throwaway test DB. The
 * `/admin` list check additionally needs `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD`
 * and is skipped without them (credentials are never hardcoded).
 */
const PHONE_PREFIX = '+8801';

test.describe('lead capture', () => {
  test.afterEach(async () => {
    await deleteLeadsByPhonePrefix(PHONE_PREFIX);
  });

  test('submits name+phone only (no email) and returns leadId + eventId', async ({ request }) => {
    const phone = probePhone();
    const eventId = `evt-e2e-${Date.now()}`;
    const response = await request.post('/api/leads', {
      data: {
        name: 'E2E Probe',
        phone,
        consentGiven: true,
        consentText: 'privacy-v1',
        eventId,
        turnstileToken: E2E_TOKEN,
      },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { leadId: number; eventId: string; success: boolean };
    expect(body.success).toBe(true);
    expect(body.leadId).toBeGreaterThan(0);
    // event_id the browser pixel shares with CAPI: echoed verbatim.
    expect(body.eventId).toBe(eventId);
    expect(await countLeadsByPhonePrefix(phone)).toBe(1);
  });

  test('duplicate phone is a warning, not a block', async ({ request }) => {
    const phone = probePhone();
    const payload = {
      name: 'E2E Probe',
      phone,
      consentGiven: true,
      consentText: 'privacy-v1',
      turnstileToken: E2E_TOKEN,
    };
    const first = await request.post('/api/leads', { data: payload });
    expect(first.status()).toBe(201);
    const firstBody = (await first.json()) as { leadId: number };
    expect('duplicateWarning' in firstBody).toBe(false);

    const second = await request.post('/api/leads', { data: payload });
    expect(second.status()).toBe(201);
    const secondBody = (await second.json()) as {
      leadId: number;
      duplicateWarning: { leadId: number; status: string };
    };
    // Both rows are stored (a resubmission is never a lost lead); the second
    // response points at the first so the salesperson can dedupe.
    expect(secondBody.leadId).not.toBe(firstBody.leadId);
    expect(secondBody.duplicateWarning.leadId).toBe(firstBody.leadId);
  });

  test('missing Turnstile token is a 400 and stores nothing', async ({ request }) => {
    const phone = probePhone();
    const response = await request.post('/api/leads', {
      data: { name: 'E2E Probe', phone, consentGiven: true, consentText: 'privacy-v1' },
    });
    expect(response.status()).toBe(400);
    expect(await countLeadsByPhonePrefix(phone)).toBe(0);
  });

  test('form validates client-side: empty name never submits', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#lead-form');
    await form.locator('input[type="tel"]').first().fill('01712345678');
    await form.locator('input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    // Native `required` (or the client guard) stops the submit: no success
    // state, still on the landing page.
    await expect(form).not.toContainText('Demo Request Received');
    expect(page.url()).not.toContain('/admin');
  });

  test('the submitted lead appears in the /admin leads list with the right phone', async ({
    page,
    request,
  }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? '';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(email === '' || password === '', 'no E2E admin credentials: set E2E_ADMIN_EMAIL/PASSWORD to run the admin-list check');
    const phone = probePhone();
    const created = await request.post('/api/leads', {
      data: {
        name: 'E2E Admin List Probe',
        phone,
        consentGiven: true,
        consentText: 'privacy-v1',
        turnstileToken: E2E_TOKEN,
      },
    });
    expect(created.status()).toBe(201);

    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin', { timeout: 15_000 });
    await expect(page.getByText(phone).first()).toBeVisible({ timeout: 15_000 });
  });
});
