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

// Build-time / plain-Node singleton ONLY (no request exists there — `next build`
// prerender, seed scripts, `next dev` without the wrangler proxy, unit tests).
// The build is single-threaded Node, so sharing one client across calls is safe.
let client: ReturnType<typeof postgres> | null = null;
let cached: Database | null = null;
let cachedUrl = '';

// One drizzle instance per live request, keyed by the request's Cloudflare context
// object (stable per request via the entrypoint's AsyncLocalStorage). Weakly held:
// when the request ends and its context is dropped, the entry collects itself.
const perRequestDbs = new WeakMap<object, Database>();

/**
 * Resolve the Postgres connection string for the current execution context.
 *
 * 1. Inside a request, the Hyperdrive binding is authoritative. It is the only source
 *    that exists in production, and it never exists outside a request.
 * 2. At build time `next build` prerenders the static shell and executes every cached
 *    function once. That happens with no request, so `getCloudflareContext()` throws
 *    (sync mode requires a request context) and there is no binding to read. Without
 *    the `DIRECT_URL` fallback the very first prerender fails with
 *    `HYPERDRIVE_NOT_BOUND`; CI therefore exposes `DIRECT_URL` to the build step as
 *    well as to the migration step.
 */
function resolveConnection(): { url: string; inRequest: boolean } {
  try {
    const { env } = getCloudflareContext();
    const bound = env.HYPERDRIVE?.connectionString;
    if (bound) return { url: bound, inRequest: true };
  } catch {
    // No Cloudflare context: build-time prerender, `next dev` without the wrangler
    // proxy, or a plain Node script. Fall through to the direct-connection fallback.
  }
  const buildUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (buildUrl) return { url: buildUrl, inRequest: false };
  throw new Error('HYPERDRIVE_NOT_BOUND');
}

function createClient(url: string, max: number): ReturnType<typeof postgres> {
  // prepare:false -> transaction-pooler safe (Supabase 6543 / Hyperdrive): prepared
  //                  statements do not survive PgBouncer in transaction mode.
  // connect_timeout:10 -> without this, a blackholed network (SYN dropped, no RST —
  //                  exactly what GitHub runners hit against an unreachable Supabase
  //                  host) hangs TCP connect for minutes. Ten seconds bounds every
  //                  failure mode to fast-and-loud, so callers degrade to the static
  //                  fallback instead of hanging (2026-10-06).
  // max_lifetime:60 + idle_timeout:20 -> pool self-healing (2026-10-08 prod).
  //                  withTimeout rejects the WAITER after 12s, but the stuck query keeps
  //                  holding its pool slot forever — slots accumulate until every slot is
  //                  a zombie and every new query hangs (observed: even trivial COUNTs
  //                  timing out). Rotating connections every minute guarantees a stuck
  //                  slot dies and is replaced with a fresh one; idle ones are reaped
  //                  even sooner. Hyperdrive multiplexes server-side, so churn is cheap.
  return postgres(url, {
    prepare: false,
    max,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60,
  });
}

/**
 * Drizzle client for the current execution context.
 *
 * Request path (Hyperdrive resolves): ONE `postgres()` client + drizzle instance per
 * REQUEST, memoized on the request's Cloudflare context object and shared across all
 * `getDb()` calls within that request — never across requests. One isolate serves many
 * CONCURRENT requests on Workers, and postgres.js ties sockets to the request context
 * that opened them (workerd cancels continuations resolving in the wrong context with
 * "A promise was resolved or rejected from a different request context" — observed live
 * 2026-10-09 during an `/admin/cms` burst). The hard invariant: **no socket-owning
 * object may be shared across requests in the isolate.** Memoizing per request (not per
 * call) matters because every fresh client pays full connection setup on first query
 * (TCP + TLS + Postgres handshake, 0.6–3s via Hyperdrive): a CMS burst of ~10 API
 * requests × several queries each created hundreds of simultaneous handshakes and
 * exhausted the worker (1102, observed 2026-10-09). The context object is stable per
 * request (the entrypoint scopes `{env, ctx, cf}` in AsyncLocalStorage), so it is a
 * correct WeakMap key; keys are weakly held, so nothing leaks when the request ends.
 * Hyperdrive pools server-side, so one client per request is cheap; correctness first.
 * `max: 3` (each client serves one request, not the whole isolate). Idle pools are
 * reaped by `idle_timeout`/`max_lifetime`, never by an explicit `end()` — see below.
 *
 * Build path (no request): the module singleton is reused and only rebuilt when the
 * resolved URL changes (preview vs production environment swap).
 */
export function getDb(): Database {
  const { url, inRequest } = resolveConnection();
  if (inRequest) {
    // Eager end() is FORBIDDEN here: postgres.js sets the pool's internal `ending` flag
    // the moment end() is invoked, so every later query rejects with CONNECTION_ENDED and
    // the whole Worker loses its database (observed: all DB routes down, public pages on
    // static fallback). Reaping is handled by idle_timeout:20 + max_lifetime:60 above.
    // getCloudflareContext() cannot throw here — inRequest is true only when the
    // Hyperdrive binding resolved from it a moment ago.
    const store = getCloudflareContext();
    const memoized = perRequestDbs.get(store);
    if (memoized) return memoized;
    const fresh = drizzle(createClient(url, 3), { schema });
    perRequestDbs.set(store, fresh);
    return fresh;
  }
  if (!cached || cachedUrl !== url) {
    if (client) {
      const stale = client;
      client = null;
      // Fire-and-forget close: the old URL is no longer reachable, and holding it open
      // would keep a dead connection slot in the pool.
      void stale.end({ timeout: 5 }).catch(() => undefined);
    }
    client = createClient(url, 10);
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
    resolveConnection();
    return true;
  } catch {
    return false;
  }
}
