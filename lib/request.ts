/**
 * Request-derived values used by more than one handler.
 */

/**
 * Best-effort client IP.
 *
 * `cf-connecting-ip` is authoritative on Cloudflare (the edge overwrites it), `x-real-ip`
 * covers the local wrangler proxy, and `x-forwarded-for` is the last resort in `next dev`.
 * Never treat the result as trusted when the deployment is *not* behind Cloudflare — the
 * header is forgeable there.
 */
export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  );
}

/**
 * Correlation id for one request (Task 16 §7).
 *
 * Prefers Cloudflare's own `cf-ray` so a Worker log line joins to the Cloudflare dashboard
 * entry and to the edge's access log — a locally generated uuid would not. Falls back to an
 * inbound `x-request-id` (propagated by a trusted caller, e.g. the WAF/API-gateway tier), and
 * only mints its own when neither is present.
 *
 * Purely an observability value: never used for authorisation, and never derived from
 * user input, so a hostile caller supplying `x-request-id` can at worst poison a log line's
 * correlation field with their own text. To keep that from becoming log injection the value is
 * length-bounded and stripped of anything that is not identifier-safe.
 */
export function requestId(request: Request): string {
  const inbound =
    request.headers.get('cf-ray') ??
    request.headers.get('x-request-id') ??
    request.headers.get('x-vercel-log-id') ??
    '';
  const cleaned = inbound.trim().slice(0, 120);
  // Reject anything with structural characters so a crafted header cannot inject newlines
  // into a log line or impersonate a different field.
  if (cleaned !== '' && /^[A-Za-z0-9._:-]+$/.test(cleaned)) return cleaned;
  return newCorrelationId();
}

/** A fresh correlation id for a request that carried none. */
export function newCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // `crypto.randomUUID` exists on every modern runtime; the fallback only matters in exotic
    // environments, where a weaker-but-unique id still beats failing the request.
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
