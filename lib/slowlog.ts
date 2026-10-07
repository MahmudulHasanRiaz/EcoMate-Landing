/**
 * Slow-stage instrumentation: log a warning ONLY when an awaited stage exceeds
 * a threshold, silent otherwise.
 *
 * Why this exists instead of more logs: on Workers a hung await produces ZERO
 * log output (no error is ever thrown), so failures are invisible — the request
 * just runs until the runtime kills it. A warn-on-slow threshold turns "hung
 * silently for 4 minutes" into "stage X exceeded 10s" in the log stream, which
 * names the exact stage. Fast path emits nothing: zero quota cost when healthy.
 *
 * Not a replacement for withTimeout (which converts hangs into fallback values).
 * This answers "WHERE is it slow", withTimeout answers "don't hang forever".
 */
export async function timed<T>(
  promise: Promise<T>,
  label: string,
  thresholdMs = 10_000,
  extra?: Record<string, unknown>,
): Promise<T> {
  // Next 16 forbids Date.now() during prerender ("unstable value" build error).
  // Timing is a runtime diagnostic anyway — at build time, pass through untouched.
  if (process.env.NEXT_PHASE === 'phase-production-build') return promise;
  const start = Date.now();
  try {
    return await promise;
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed >= thresholdMs) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'slow-stage',
          stage: label,
          elapsedMs: elapsed,
          ...(extra ?? {}),
        }),
      );
    }
  }
}
