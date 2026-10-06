/**
 * Distributed rate limiting on Cloudflare KV (Task 14 §1).
 *
 * One counter per `(key, window)` bucket: the window index is part of the KV key, so an
 * expired window can never be read again and the TTL only exists to garbage-collect keys.
 * KV has no atomic increment, so a read-modify-write race can undercount by a request or
 * two — acceptable here because this is the *second* layer: Cloudflare WAF rate rules run
 * first, and account lockout (`auth.ts`) plus the audit log are per-account.
 *
 * ## Fail direction (deliberate, documented)
 *
 * - **KV binding absent** (local `next dev`, a preview without the namespace): allow. The
 *   per-isolate backstop in `app/api/leads/route.ts` still applies, and a developer should
 *   not be locked out of their own form.
 * - **KV read/write throws** (namespace deleted, quota exhaustion, transient platform
 *   error): fail **open** and log a warning. A KV blip must never take down lead capture —
 *   losing revenue is worse than briefly losing a rate limit, and the WAF layer plus the
 *   in-isolate backstop remain in front of the endpoint.
 * - **Limit exceeded**: the caller gets `true` and answers 429/400. That is the only
 *   fail-closed branch, because it is the deliberate security outcome.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

/** KV keys allow more than this, but a bounded key keeps a hostile `key` from surprising us. */
const MAX_KEY_LENGTH = 200;
const UNSAFE_KEY_CHARS = /[^a-zA-Z0-9:._-]+/g;

function normalizeKey(key: string): string {
  return key.replace(UNSAFE_KEY_CHARS, '_').slice(0, MAX_KEY_LENGTH);
}

/**
 * Count one hit against `key` and report whether the caller is now over `limit` in the
 * current `windowSec` window.
 *
 * Returns `true` when the request should be rejected, `false` when it may proceed.
 */
export async function hitLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  // A misconfigured call site (zero/negative window) must not open a fail-open trapdoor:
  // treat it as "no limit configured" and let the caller's other layers decide.
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(windowSec) || windowSec <= 0) {
    return false;
  }

  try {
    const kv = getCloudflareContext().env.RATE_LIMIT_KV;
    if (!kv) return false; // No binding (local dev): backstop only, never block here.

    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / windowSec);
    const windowKey = `${normalizeKey(key)}:${bucket}`;

    const stored = Number.parseInt((await kv.get(windowKey)) ?? '0', 10);
    const previous = Number.isFinite(stored) && stored > 0 ? stored : 0;
    const count = previous + 1;

    // TTL of two windows makes an expired bucket unreachable before it disappears.
    await kv.put(windowKey, String(count), { expirationTtl: windowSec * 2 });

    return count > limit;
  } catch (error) {
    // Fail open — see the file header. Never let a KV outage break a public form.
    console.warn('[rateLimit] KV unavailable; allowing request', error);
    return false;
  }
}
