/**
 * GET /api/ready — deep readiness probe (Task 16 §7).
 *
 * ## Readiness vs `/api/health`
 *
 * `/api/health` (Task 3) is a liveness answer: it reports whether bindings *exist* and never
 * touches a dependency, so it stays fast and cannot fail for a reason that warrants a restart.
 * This endpoint actually exercises each dependency:
 *
 *  - **Postgres** — `SELECT 1`. A `SELECT 1` still needs a connection from the pool, so this
 *    catches an unreachable host, an exhausted pool and a Hyperdrive misconfiguration.
 *  - **R2** — a `head()` on the bucket. `head` on a missing key is a 404, which still proves the
 *    bucket is reachable and answering, so a deliberately-absent probe key is the cheapest
 *    round trip that touches the real service.
 *  - **KV** — a `get()` on a probe key. Same reasoning: a miss is a valid answer.
 *
 * ## Why 503
 *
 * The status code is the point of the endpoint. A readiness probe that answers 200 while the
 * database is unreachable is worse than no probe, because the platform keeps routing traffic to
 * a Worker that cannot serve it. 503 tells the edge the instance is out of rotation.
 *
 * ## Why it is not cached
 *
 * A cached readiness answer is the classic failure mode: the probe reports the state at the
 * moment it was cached, so an outage persists for the cache TTL and a recovery is invisible for
 * the same duration. `Cache-Control: no-store` plus an uncached `Date.now()` read below make
 * this handler ineligible for Next's response cache. Route Handlers are dynamic by default and
 * this one reads the request URL and the Cloudflare context on every call, so there is no
 * `'use cache'` boundary to defeat. It is **not** `export const dynamic = 'force-dynamic'`,
 * which Next 16 removed.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { logServerError } from '@/lib/json';
import { isNotificationProviderConfigured } from '@/lib/notify';
import { requestId } from '@/lib/request';

type CheckStatus = 'ok' | 'failed' | 'not_configured';

interface Check {
  status: CheckStatus;
  latencyMs: number;
  error?: string;
}

/** A probe key that is never written. A miss is a successful round trip. */
const PROBE_KEY = '__readiness_probe__';

async function timed<T>(run: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const started = Date.now();
  const value = await run();
  return { value, latencyMs: Date.now() - started };
}

/**
 * Wrap one dependency probe.
 *
 * A thrown error becomes a `failed` check rather than a rejected promise: one unreachable
 * dependency must still produce a full report naming *all* of them, because "the database is
 * down" and "the database and R2 are down" are different pages.
 */
async function probe(run: () => Promise<unknown>): Promise<Check> {
  try {
    const { latencyMs } = await timed(run);
    return { status: 'ok', latencyMs };
  } catch (e) {
    return {
      status: 'failed',
      latencyMs: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET(req: Request): Promise<Response> {
  const reqId = requestId(req);

  // Read the bindings once. `getCloudflareContext()` throws outside a Worker request (build
  // time, a plain Node script), which is exactly the "not configured" case.
  let bindings: {
    r2?: R2Bucket;
    kv?: KVNamespace;
  } = {};
  try {
    const { env } = getCloudflareContext();
    bindings = { r2: env.R2_BUCKET, kv: env.RATE_LIMIT_KV };
  } catch {
    // No execution context: both binding checks report `not_configured` below.
  }

  const [database, storage, cache] = await Promise.all([
    probe(async () => {
      await getDb().execute(sql`SELECT 1`);
    }),
    bindings.r2
      ? probe(async () => {
          // `head` on a key that does not exist resolves (not rejects) with a null body, which
          // is a successful round trip against a live bucket.
          await bindings.r2!.head(PROBE_KEY);
        })
      : Promise.resolve({ status: 'not_configured', latencyMs: 0 } satisfies Check),
    bindings.kv
      ? probe(async () => {
          await bindings.kv!.get(PROBE_KEY);
        })
      : Promise.resolve({ status: 'not_configured', latencyMs: 0 } satisfies Check),
  ]);

  // Only the database is load-bearing for serving pages: content, auth and every API route read
  // it. R2 and KV back media and rate limiting respectively, and a missing KV already fails
  // *open* by design (`lib/rateLimit.ts`). Failing the whole probe on those would take an
  // instance out of rotation for a degradation the app is explicitly built to survive.
  const ready = database.status !== 'failed';
  const degraded = ready && (storage.status === 'failed' || cache.status === 'failed');

  const body = {
    status: ready ? (degraded ? 'degraded' : 'ready') : 'not_ready',
    checks: { database, storage, cache },
    // Informational, not part of the readiness decision: a queued-notification state is an
    // operational fact an operator wants, not an outage.
    notificationProvider: isNotificationProviderConfigured() ? 'configured' : 'log_only',
    requestId: reqId,
    timestamp: new Date().toISOString(),
  };

  if (!ready) {
    console.error(JSON.stringify({ event: 'readiness.failed', level: 'error', ...body }));
  }

  return Response.json(body, {
    status: ready ? 200 : 503,
    headers: {
      // The one header that matters most here. A cached readiness answer outlives the state it
      // describes, in both directions — a stale "ready" during an outage, a stale "not ready"
      // long after the recovery.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}