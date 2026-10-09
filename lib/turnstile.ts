/**
 * Cloudflare Turnstile server-side verification (Task 14 §2, Phase 3b Item 19).
 *
 * ## Fail direction (hybrid policy, Decision 3)
 *
 * - **`TURNSTILE_SECRET_KEY`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset** (local dev, or a
 *   deployment where the widget has not been provisioned yet): skip verification, LOUDLY
 *   (error-level log + `turnstile_daily_stats` row). Blocking every lead because the
 *   secret is missing would take the lead form offline for an operator mistake.
 * - **Explicit `success: false` for a client-attributable reason** (`invalid-input-response`,
 *   `timeout-or-duplicate`, …): reject with 400. This is the security-relevant outcome —
 *   fail CLOSED.
 * - **`success: false` for a configuration reason** (`invalid-input-secret`,
 *   `missing-input-secret`, `internal-error`, …): log loudly and allow. The visitor did
 *   nothing wrong; our secret is broken, and dropping every lead would turn a
 *   misconfiguration into a revenue outage. Same fail-open direction for transport
 *   failure / unparsable body.
 * - **Sustained skips**: every outcome lands in `turnstile_daily_stats`; the trailing-7d
 *   skip share drives the alert flag on `GET /api/admin/turnstile` (M-13). A protection
 *   that is silently off is worse than no protection with an alert.
 */
import { sql } from 'drizzle-orm';
import { envString } from '@/lib/env';
import { logOnce } from '@/lib/json';
import { getDb } from '@/db/client';
import { turnstileDailyStatsTable } from '@/db/schema';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const VERIFY_TIMEOUT_MS = 5000;

/** Error codes that point at *our* configuration, not at the visitor's token. */
const SERVER_FAULT_CODES: ReadonlySet<string> = new Set([
  'missing-input-secret',
  'invalid-input-secret',
  'missing-input-response',
  'bad-request',
  'internal-error',
]);

export type TurnstileVerdict =
  | { readonly ok: true; readonly skipped: boolean }
  | { readonly ok: false; readonly reason: string };

/**
 * E2E test-mode bypass (Task 18 Step 3).
 *
 * Impossible to enable in production by construction: it requires BOTH
 * `E2E_TEST_MODE=1` in the process environment (never set in `[vars]`,
 * `wrangler secret` or any deployment config — only in the local shell that
 * starts the throwaway preview server) AND a localhost-family request hostname
 * (`localhost`, `127.0.0.1`, `::1`, `*.localhost`, `*.local`). Production
 * serves `ecomate.bd`, so even a leaked flag does nothing there, and even a
 * spoofed `Host` header does nothing without the flag. Either condition alone
 * leaves verification untouched.
 *
 * The bypass never excuses a missing token: an empty token is still a 400, so
 * the "missing Turnstile token" spec holds in every environment.
 */
export function isLocalE2eBypass(requestUrl: string): boolean {
  if (process.env.E2E_TEST_MODE !== '1') return false;
  let hostname = '';
  try {
    hostname = new URL(requestUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  );
}

function readErrorCodes(record: { 'error-codes'?: unknown }): string[] {
  return Array.isArray(record['error-codes'])
    ? record['error-codes'].filter((code): code is string => typeof code === 'string')
    : [];
}

export async function verifyTurnstile(token: string, ip: string): Promise<TurnstileVerdict> {
  // The widget (public site key) and the verifier (secret) are a pair: without a rendered
  // widget no legitimate visitor can possess a token, so demanding one would reject 100%
  // of submissions over an operator half-configuration (secret set, site key missing).
  // Fail open loudly instead — same direction as every other misconfiguration here.
  const siteKey = envString('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  if (siteKey === '') {
    logOnce('error', 'turnstile:no-sitekey', '[turnstile] site key not configured — widget cannot exist, skipping verification (no bot protection active)');
    return { ok: true, skipped: true };
  }
  const secret = envString('TURNSTILE_SECRET_KEY');
  if (secret === '') {
    logOnce('error', 'turnstile:no-secret', '[turnstile] secret not configured — widget renders but tokens cannot be verified, skipping (no bot protection active)');
    return { ok: true, skipped: true };
  }

  const candidate = token.trim();
  if (candidate === '' || candidate.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'missing-response' };
  }

  try {
    const body = new URLSearchParams({ secret, response: candidate });
    if (ip !== '') body.set('remoteip', ip);

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    const payload: unknown = await response.json().catch(() => null);
    const record =
      typeof payload === 'object' && payload !== null
        ? (payload as { success?: unknown; 'error-codes'?: unknown })
        : null;

    if (record?.success === true) return { ok: true, skipped: false };

    if (record?.success === false) {
      const codes = readErrorCodes(record);
      if (codes.some((code) => SERVER_FAULT_CODES.has(code))) {
        logOnce(
          'error',
          'turnstile:server-fault',
          `[turnstile] siteverify reported a configuration problem (${codes.join(',') || response.status}); allowing request (no bot protection for it)`,
        );
        return { ok: true, skipped: true };
      }
      return { ok: false, reason: codes.join(',') || 'verification-failed' };
    }

    // No parseable verdict at all (HTTP error page, truncated body): fail open, loudly.
    logOnce('error', 'turnstile:no-verdict', `[turnstile] siteverify returned HTTP ${response.status} without a verdict; allowing request`);
    return { ok: true, skipped: true };
  } catch (error) {
    logOnce('error', 'turnstile:unreachable', '[turnstile] siteverify unreachable; allowing request', error);
    return { ok: true, skipped: true };
  }
}

export type TurnstileOutcome = 'verified' | 'rejected' | 'skipped';

/**
 * Record one verification outcome in the daily aggregate (M-13 sustained-skip
 * monitoring). Best-effort and NEVER throwing: monitoring must not break the lead
 * it observes. Callers hand the promise to `keepAlive`/`ctx.waitUntil` so a recycled
 * isolate cannot cancel it.
 */
export async function recordTurnstileOutcome(outcome: TurnstileOutcome): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const column =
      outcome === 'verified'
        ? turnstileDailyStatsTable.verified
        : outcome === 'rejected'
          ? turnstileDailyStatsTable.rejected
          : turnstileDailyStatsTable.skipped;
    await getDb()
      .insert(turnstileDailyStatsTable)
      .values({ day, verified: 0, rejected: 0, skipped: 0 })
      .onConflictDoUpdate({
        target: turnstileDailyStatsTable.day,
        set: { updatedAt: new Date(), [outcome]: sql`${column} + 1` },
      });
  } catch {
    // Monitoring is expendable; the lead is not.
  }
}
