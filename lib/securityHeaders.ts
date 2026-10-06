/**
 * Security headers applied to every response that flows through the proxy (Task 14 §3).
 *
 * ## Why `script-src` still carries `'unsafe-inline'`
 *
 * The plan's tight CSP omits it, but a nonce cannot be shipped here: under Cache Components
 * (`cacheComponents: true`) the landing shell is **prerendered at build time**, so there is
 * no per-request value to bake into it. Next.js emits inline bootstrap scripts
 * (`self.__next_f.push(...)` RSC payload, `next/script` snippets) into that static HTML; with
 * `script-src 'self'` and no nonce, the browser blocks hydration and the Meta pixel and
 * Turnstile both stop executing. The pragmatic, working middle ground is an explicit
 * `'unsafe-inline'` **without** `'strict-dynamic'` (the two together would neutralise
 * `'unsafe-inline'` and break the site again), while every *external* origin stays
 * allowlisted and `default-src 'self'` still blocks anything not named below.
 *
 * `connect-src` names the Meta endpoints the pixel posts to and Turnstile's endpoint; the
 * pixel's 1×1 fallback image is covered by `img-src https:`.
 *
 * Development (`next dev`) additionally gets `'unsafe-eval'` (React Fast Refresh) and
 * `ws:`/`wss:` (HMR socket). Production gets neither.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  `script-src 'self' 'unsafe-inline' https://connect.facebook.net https://challenges.cloudflare.com${
    IS_PRODUCTION ? '' : " 'unsafe-eval'"
  }`,
  `connect-src 'self' https://graph.facebook.com https://connect.facebook.net https://challenges.cloudflare.com https://www.facebook.com${
    IS_PRODUCTION ? '' : ' ws: wss:'
  }`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // The Turnstile widget is an iframe served from challenges.cloudflare.com.
  "frame-src 'self' https://challenges.cloudflare.com",
  ...(IS_PRODUCTION ? ['upgrade-insecure-requests'] : []),
].join('; ');

/** Every header this app promises on every response, in one place. */
export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Content-Security-Policy', CONTENT_SECURITY_POLICY],
];

export function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of SECURITY_HEADERS) headers.set(name, value);
}
