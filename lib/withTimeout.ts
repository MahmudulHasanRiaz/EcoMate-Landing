/**
 * Bound an async operation that must never hang the caller.
 *
 * Context: on Cloudflare Workers a database (or cache) read that never settles
 * hangs the whole request until the runtime kills it — the visitor sees a timeout
 * and the logs show only "hung", never the cause. Every public read in this app
 * already degrades to a static fallback on ERROR (`lib/content.ts` catch blocks);
 * this helper extends the same contract to HANGS by turning them into errors.
 *
 * 12s default: comfortably above p99 query latency (ms), far below the ~30s
 * runtime kill. Loud on timeout (not silent) so logs distinguish "slow DB" from
 * "dead DB".
 */
export async function withTimeout<T>(promise: Promise<T>, label: string, ms = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`[db-timeout] ${label} exceeded ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
