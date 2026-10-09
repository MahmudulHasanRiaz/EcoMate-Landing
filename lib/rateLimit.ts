/**
 * Distributed rate limiting on Postgres (Phase 3b Item 18, Decision 2).
 *
 * No KV namespace, no Durable Objects, no new Cloudflare services — only the existing
 * Postgres (via Hyperdrive) plus the per-isolate in-memory backstop that lives at each
 * call site. One row per `(key, window-size)` bucket in `rate_limit_counters`,
 * incremented by a single atomic upsert: concurrent requests serialize on the PK
 * conflict and every hit counts.
 *
 * Window mechanics: the bucket index is part of the KEY (`lead:<ip>:w600`), so an
 * expired bucket is unreachable the moment time moves on — no TTL, no read of stale
 * state. `timestamptz` throughout (Phase 3a publish-cron lesson: naive timestamps
 * phantom-shift across sessions).
 *
 * ## Fail direction (deliberate, documented)
 *
 * - **DB unreachable / query throws**: fail **open** and log. A Postgres blip must
 *   never take down lead capture — losing revenue is worse than briefly losing a rate
 *   limit, and the per-isolate backstop plus Turnstile remain in front of the endpoint.
 * - **Limit exceeded**: the caller gets `true` and answers 429 + `Retry-After`. That
 *   is the only fail-closed branch, because it is the deliberate security outcome.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { rateLimitCountersTable } from '@/db/schema';
import { logOnce } from '@/lib/json';

/** KV keys allow more than this, but a bounded key keeps a hostile `key` from surprising us. */
const MAX_KEY_LENGTH = 200;
const UNSAFE_KEY_CHARS = /[^a-zA-Z0-9:._-]+/g;

function normalizeKey(key: string): string {
  return key.replace(UNSAFE_KEY_CHARS, '_').slice(0, MAX_KEY_LENGTH);
}

/** Opportunistic sweep chance per call: stale buckets die within ~100 calls of expiring. */
const SWEEP_PROBABILITY = 0.01;
/** A bucket older than this is garbage (windows are minutes-to-hours). */
const SWEEP_AFTER_MS = 24 * 60 * 60 * 1000;

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
    const nowMs = Date.now();
    const bucket = Math.floor(nowMs / 1000 / windowSec);
    const bucketStart = new Date(bucket * windowSec * 1000);
    const bucketKey = `${normalizeKey(key)}:w${Math.floor(windowSec)}`;

    const [row] = await getDb()
      .insert(rateLimitCountersTable)
      .values({ key: bucketKey, windowStart: bucketStart, count: 1, updatedAt: new Date(nowMs) })
      .onConflictDoUpdate({
        target: rateLimitCountersTable.key,
        // Same bucket: increment. New bucket: restart at 1 (the old row is reborn —
        // no delete needed, cardinality stays one row per key).
        //
        // The bucket comparison reads `excluded` (the proposed-insert row) instead of
        // interpolating `bucketStart` a second time: a free-form `${date}` param
        // bypasses drizzle's column type-mapping and reaches the driver as a raw
        // `Date`, which the bundled postgres.js rejects (verified live — the
        // column-mapped VALUES/SET params serialize fine, the free one throws).
        // `excluded."window_start"` is the same instant by construction.
        set: {
          count: sql`CASE WHEN ${rateLimitCountersTable.windowStart} = excluded."window_start" THEN ${rateLimitCountersTable.count} + 1 ELSE 1 END`,
          windowStart: bucketStart,
          updatedAt: new Date(nowMs),
        },
      })
      .returning({ count: rateLimitCountersTable.count });

    // Opportunistic sweep (never on the hot path's critical result): one row per key
    // means cardinality follows caller count, and source IPs are unbounded over time.
    if (Math.random() < SWEEP_PROBABILITY) {
      void sweepStale(nowMs).catch(() => undefined);
    }

    return (row?.count ?? 0) > limit;
  } catch (error) {
    // Fail open — see the file header. Never let a DB outage break a public form.
    logOnce('warn', 'ratelimit:db', '[rateLimit] counter unavailable; allowing request', error);
    return false;
  }
}

/** Delete buckets untouched for over a day. Best-effort: failure only costs disk. */
async function sweepStale(nowMs: number): Promise<void> {
  try {
    await getDb()
      .delete(rateLimitCountersTable)
      .where(sql`${rateLimitCountersTable.updatedAt} < ${new Date(nowMs - SWEEP_AFTER_MS)}`);
  } catch {
    // Ignored — the next probabilistic sweep retries.
  }
}

/**
 * Seconds until the caller's current window resets — the `Retry-After` value for 429s.
 * Pure clock arithmetic (no I/O): safe to call on the rejection path.
 */
export function retryAfterSec(windowSec: number, nowMs = Date.now()): number {
  if (!Number.isFinite(windowSec) || windowSec <= 0) return 60;
  const elapsed = Math.floor(nowMs / 1000) % Math.floor(windowSec);
  return Math.max(1, Math.floor(windowSec) - elapsed);
}
