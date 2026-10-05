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
