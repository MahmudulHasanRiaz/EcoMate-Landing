/**
 * Next.js 16 renamed `middleware.ts` → `proxy.ts` and the required export from
 * `middleware()` → `proxy()`. Do not add a `middleware.ts`; v16 ignores it (with a
 * warning), which would silently remove every admin gate below.
 *
 * Auth.js v5's `auth` wrapper is a drop-in for either name. It reads the session cookie
 * and then consults `callbacks.authorized` in `auth.ts`, which holds the actual
 * public/private policy, the `Cache-Control: no-store` header for admin HTML and — since
 * Task 14 — the security headers (`lib/securityHeaders.ts`) that must ride on every
 * response. A bare `export { auth as proxy }` cannot do that: attaching headers requires
 * building the response, and that happens in the callback.
 *
 * Segment config (`export const runtime`) is rejected in a Proxy file — Next 16 always runs
 * Proxy on the Node.js runtime, which is why importing the Drizzle-backed auth config here
 * is safe.
 */
export { auth as proxy } from '@/auth';

export const config = {
  /**
   * `/admin/*` needs the session gate; `/api/*` needs it for every mutating method except
   * the public lead POST. The catch-all is what lets the security headers reach the public
   * pages (a prerendered marketing page is still a document that must not be framed and
   * must not load unlisted script origins) — static files and Next's own asset routes are
   * excluded because they are not documents and carrying the session lookup on every image
   * would be pure overhead.
   */
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]*$).*)',
  ],
};
