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
  // Next 16 forbids Date.now() during prerender ("unstable value" build error) — and
  // that includes the on-demand prerender of an unenumerated slug at request time, where
  // NEXT_PHASE no longer reads 'phase-production-build'. Timing is a runtime diagnostic
  // anyway, so it uses performance.now(), the timing API Next sanctions for telemetry:
  // monotonic, available in Node/Workers/browsers, never flagged as unstable.
  const start = performance.now();
  try {
    return await promise;
  } finally {
    const elapsed = performance.now() - start;
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
