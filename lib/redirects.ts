/**
 * Managed redirects, served from KV with a database fallback (Task 15 §1).
 *
 * A redirect table is only useful if it is consulted *before* the router, otherwise a moved
 * page 404s until someone deploys. The lookup runs on every matched request, so it is not
 * allowed to touch Postgres per request: the whole (small) table is read into one KV key and
 * served from there for five minutes, which is the same refresh window `lib/rateLimit.ts`
 * already uses for its counters.
 *
 * ## Fail direction (deliberate, documented — same posture as `lib/rateLimit.ts`)
 *
 * - **No KV binding** (local `next dev`, a preview without the namespace): read the database
 *   directly and use an in-process memo, so the behaviour is still correct, just uncached.
 * - **KV or database throws** (namespace deleted, quota exhausted, Postgres down): return
 *   `null` and let the request through. A redirect table is a convenience for URL hygiene; it
 *   must never be able to take the site offline.
 * - **Both KV and the database are down**: a negative memo stops the failure from costing a
 *   query on *every* request, which would turn one outage into two.
 */
import { asc } from 'drizzle-orm';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/db/client';
import { redirectsTable } from '@/db/schema';
import { errorMessage, logOnce } from '@/lib/json';

/** Refresh window for the KV copy. Matches the content cache's `stale`. */
const REDIRECT_TTL_SEC = 300;

/** Bumped by hand when the stored shape changes, so an old value is never parsed as new. */
const REDIRECT_KV_KEY = 'redirects:v1';

/** How long a *failure* is remembered when there is no KV to cache it in. */
const FAILURE_MEMO_MS = 60_000;

export interface ManagedRedirect {
  fromPath: string;
  toPath: string;
  statusCode: number;
}

let memoryCache: { value: ManagedRedirect[]; expiresAt: number } | null = null;
let memoryFailureUntil = 0;

function readKv(): KVNamespace | undefined {
  try {
    return getCloudflareContext().env.RATE_LIMIT_KV;
  } catch {
    // No Cloudflare context (build time / plain Node): fall back to the database + memo.
    return undefined;
  }
}

function parseTable(json: string): ManagedRedirect[] | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (row): row is ManagedRedirect =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as ManagedRedirect).fromPath === 'string' &&
        typeof (row as ManagedRedirect).toPath === 'string' &&
        typeof (row as ManagedRedirect).statusCode === 'number',
    );
  } catch {
    // A poisoned KV value must not wedge every request: treat it as a miss and rebuild.
    return null;
  }
}

/**
 * The whole redirect table, or `null` when it could not be loaded.
 *
 * `null` is "no idea", not "no redirects" — the caller treats both the same way and lets the
 * request through.
 */
async function loadRedirectTable(): Promise<ManagedRedirect[] | null> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache.value;
  if (memoryFailureUntil > now) return null;

  const kv = readKv();
  if (kv) {
    try {
      const cached = await kv.get(REDIRECT_KV_KEY);
      if (cached) {
        const parsed = parseTable(cached);
        if (parsed) {
          memoryCache = { value: parsed, expiresAt: now + REDIRECT_TTL_SEC * 1000 };
          return parsed;
        }
      }
    } catch (e) {
      logOnce('warn', 'redirects:kv-read', '[redirects] KV read failed; falling back to the database', e);
    }
  }

  try {
    const rows = await getDb()
      .select({
        fromPath: redirectsTable.fromPath,
        toPath: redirectsTable.toPath,
        statusCode: redirectsTable.statusCode,
      })
      .from(redirectsTable)
      .orderBy(asc(redirectsTable.id));
    memoryCache = { value: rows, expiresAt: now + REDIRECT_TTL_SEC * 1000 };

    if (kv) {
      try {
        await kv.put(REDIRECT_KV_KEY, JSON.stringify(rows), { expirationTtl: REDIRECT_TTL_SEC });
      } catch (e) {
        // The database read already succeeded; a failed write only costs us the next lookup.
        logOnce('warn', 'redirects:kv-write', '[redirects] KV write failed', e);
      }
    }
    return rows;
  } catch (e) {
    memoryFailureUntil = now + FAILURE_MEMO_MS;
    logOnce('warn', 'redirects:table', '[redirects] table unavailable; requests will proceed un-redirected:', errorMessage(e));
    return null;
  }
}

/**
 * The redirect matching `pathname`, if any.
 *
 * Matching is exact on the full pathname (query string and hash excluded — a redirect rule
 * that also rewrote query strings would silently drop UTM parameters, which is the single
 * easiest way to destroy a marketing site's attribution). A DB `from_path` without a leading
 * slash is accepted, because that is how a human types it.
 */
export async function findManagedRedirect(pathname: string): Promise<ManagedRedirect | null> {
  const table = await loadRedirectTable();
  if (!table || table.length === 0) return null;
  const wanted = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return (
    table.find((row) => {
      const from = row.fromPath.startsWith('/') ? row.fromPath : `/${row.fromPath}`;
      const normalised = from.length > 1 && from.endsWith('/') ? from.slice(0, -1) : from;
      return normalised === wanted;
    }) ?? null
  );
}

/** Drop the memo. Only useful to a test or a script that must observe a write immediately. */
export function resetRedirectCache(): void {
  memoryCache = null;
  memoryFailureUntil = 0;
}