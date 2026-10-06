/**
 * Cloudflare Turnstile server-side verification (Task 14 §2).
 *
 * ## Fail direction
 *
 * - **`TURNSTILE_SECRET_KEY` unset** (local dev, or a deployment where the widget has not
 *   been provisioned yet): skip verification. Blocking every lead because the secret is
 *   missing would take the lead form offline for an operator mistake, and the widget is
 *   its own gate — a site key that is not rendered means there is no token to check.
 * - **Explicit `success: false` for a client-attributable reason** (`invalid-input-response`,
 *   `timeout-or-duplicate`, …): reject with 400. This is the security-relevant outcome.
 * - **`success: false` for a configuration reason** (`invalid-input-secret`,
 *   `missing-input-secret`, `internal-error`, …): log loudly and allow. The visitor did
 *   nothing wrong; our secret is broken, and dropping every lead would turn a
 *   misconfiguration into a revenue outage. The same applies to a transport failure or an
 *   unparsable body (`lib/rateLimit.ts` documents the identical reasoning for KV).
 */
import { envString } from '@/lib/env';

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
 * serves `ecomate.app`, so even a leaked flag does nothing there, and even a
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
  const secret = envString('TURNSTILE_SECRET_KEY');
  if (secret === '') return { ok: true, skipped: true };

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
        console.error(
          `[turnstile] siteverify reported a configuration problem (${codes.join(',') || response.status}); allowing request`,
        );
        return { ok: true, skipped: true };
      }
      return { ok: false, reason: codes.join(',') || 'verification-failed' };
    }

    // No parseable verdict at all (HTTP error page, truncated body): fail open, loudly.
    console.warn(`[turnstile] siteverify returned HTTP ${response.status} without a verdict; allowing request`);
    return { ok: true, skipped: true };
  } catch (error) {
    console.warn('[turnstile] siteverify unreachable; allowing request', error);
    return { ok: true, skipped: true };
  }
}
