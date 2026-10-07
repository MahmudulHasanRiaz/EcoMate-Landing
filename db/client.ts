import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import postgres from 'postgres';
import * as schema from './schema';

// IPv6 note: Supabase publishes AAAA records and GitHub-hosted
// runners have no IPv6 route, so a direct connection (build-time
// prerender, seed, local dev) can fail with ENETUNREACH on the
// IPv6 attempt. DNS-order hints do not reliably control which
// family postgres-js dials (observed in CI, 2026-10-06), so the
// workflows rewrite DIRECT_URL to its IPv4 address before the
// build instead — see the "Pin DIRECT_URL to IPv4" step in
// deploy.yml / preview.yml. Production connections go through
// Hyperdrive, which resolves server-side and is unaffected.
// node:dns is deliberately NOT imported here: it is only partially
// available under Workers nodejs_compat, and a static import
// could break module evaluation on the Worker runtime.

type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let cached: Database | null = null;
let cachedUrl = '';

/**
 * Resolve the Postgres connection string for the current execution context.
 *
 * 1. Inside a request, the Hyperdrive binding is authoritative. It is the only source
 *    that exists in production, and it never exists outside a request.
 * 2. At build time `next build` prerenders the static shell and executes every
 *    `'use cache'` function once. That happens with no request, so
 *    `getCloudflareContext()` throws (sync mode requires a request context) and there is
 *    no binding to read. Without the `DIRECT_URL` fallback the very first prerender
 *    fails with `HYPERDRIVE_NOT_BOUND`; CI therefore exposes `DIRECT_URL` to the build
 *    step as well as to the migration step.
 */
function resolveUrl(): string {
  try {
    const { env } = getCloudflareContext();
    const bound = env.HYPERDRIVE?.connectionString;
    if (bound) return bound;
  } catch {
    // No Cloudflare context: build-time prerender, `next dev` without the wrangler
    // proxy, or a plain Node script. Fall through to the direct-connection fallback.
  }
  const buildUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (buildUrl) return buildUrl;
  throw new Error('HYPERDRIVE_NOT_BOUND');
}

/**
 * Per-isolate Drizzle client.
 *
 * Module-scoped singleton on purpose: `getDb()` is called by every route handler, and a
 * fresh Pool per call leaks a connection for the whole lifetime of the isolate, which
 * eventually exhausts the database's `max_connections`. The client is only rebuilt when
 * the resolved URL changes (preview vs production environment swap).
 */
export function getDb(): Database {
  const url = resolveUrl();
  if (!cached || cachedUrl !== url) {
    if (client) {
      const stale = client;
      client = null;
      // Fire-and-forget close: the old URL is no longer reachable, and holding it open
      // would keep a dead connection slot in the pool.
      void stale.end({ timeout: 5 }).catch(() => undefined);
    }
    // prepare:false -> transaction-pooler safe (Supabase 6543 / Hyperdrive): prepared
    //                  statements do not survive PgBouncer in transaction mode.
    // max:10         -> was 1. A single connection serializes every parallel query of a
    //                  page behind one slot: one stuck query stalls ALL of them until the
    //                  runtime kills the request ("hung", 2026-10-07 prod). Hyperdrive
    //                  multiplexes server-side and one isolate serves one request, so 10
    //                  local slots cannot exhaust anything — but one bad query can no
    //                  longer deadlock the other nine. Combined with withTimeout on reads
    //                  and connect_timeout below, no DB wait is unbounded anymore.
    // connect_timeout:10 -> without this, a blackholed network (SYN dropped, no RST —
    //                  exactly what GitHub runners hit against an unreachable Supabase
    //                  host) hangs TCP connect for minutes. Next's prerender cache-fill
    //                  timeout fires first, failing the whole build with a misleading
    //                  "Filling a cache during prerender timed out". Ten seconds bounds
    //                  every failure mode to fast-and-loud, so callers degrade to the
    //                  static fallback instead of hanging the build (2026-10-06).
    client = postgres(url, { prepare: false, max: 10, connect_timeout: 10 });
    cached = drizzle(client, { schema });
    cachedUrl = url;
  }
  return cached;
}

/**
 * Probe used by `/api/health`. Never throws: a false result means "no Hyperdrive binding
 * and no direct URL", which is the expected state before the bindings exist.
 */
export function isPostgresConfigured(): boolean {
  try {
    resolveUrl();
    return true;
  } catch {
    return false;
  }
}
