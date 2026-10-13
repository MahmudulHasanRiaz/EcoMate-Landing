/**
 * B1 per-isolate session cache (fix/perf-overhaul) — `seoFlagCache` pattern from `proxy.ts`.
 *
 * Pure module (no `next-auth`/`next/server` imports) so vitest can import it directly.
 * `auth.ts` is the only consumer. Trade-off documented there: revocation ≤60s, fail-closed,
 * failures never cached, absolute expiry never extended.
 */
export type SessionCacheEntry = {
  role: string;
  validUntilMs: number;
  cachedUntilMs: number;
};

export const SESSION_CACHE_TTL_MS = 60_000;

const sessionCache = new Map<string, SessionCacheEntry>();

export function getCachedSession(sid: string, nowMs: number): SessionCacheEntry | null {
  const entry = sessionCache.get(sid);
  if (!entry) return null;
  if (nowMs >= entry.cachedUntilMs) {
    sessionCache.delete(sid);
    return null;
  }
  if (nowMs >= entry.validUntilMs) {
    sessionCache.delete(sid);
    return null;
  }
  return entry;
}

export function setCachedSession(
  sid: string,
  role: string,
  validUntilMs: number,
  nowMs: number,
): void {
  sessionCache.set(sid, { role, validUntilMs, cachedUntilMs: nowMs + SESSION_CACHE_TTL_MS });
}

export function invalidateCachedSession(sid: string): void {
  sessionCache.delete(sid);
}

/** Test hook: clear the isolate-local session memo between test cases. */
export function resetSessionCacheForTests(): void {
  sessionCache.clear();
}

/** Test hook: inspect cache size without exposing entries. */
export function sessionCacheSizeForTests(): number {
  return sessionCache.size;
}

/** Test hooks: direct cache access for hit/miss/expiry/fail-closed tests. */
export function getSessionCacheForTests(
  sid: string,
  nowMs: number,
): SessionCacheEntry | null {
  return getCachedSession(sid, nowMs);
}

export function setSessionCacheForTests(
  sid: string,
  role: string,
  validUntilMs: number,
  nowMs: number,
): void {
  setCachedSession(sid, role, validUntilMs, nowMs);
}

export function invalidateSessionCacheForTests(sid: string): void {
  invalidateCachedSession(sid);
}

export const SESSION_CACHE_TTL_MS_FOR_TESTS = SESSION_CACHE_TTL_MS;
