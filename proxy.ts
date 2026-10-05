/**
 * Next.js 16 renamed `middleware.ts` → `proxy.ts` and the required export from
 * `middleware()` → `proxy()`. Do not add a `middleware.ts`; v16 ignores it (with a
 * warning), which would silently remove every admin gate below.
 *
 * Auth.js v5's `auth` wrapper is a drop-in for either name. It reads the session cookie
 * and then consults `callbacks.authorized` in `auth.ts`, which holds the actual
 * public/private policy and the `Cache-Control: no-store` header for admin HTML.
 *
 * Segment config (`export const runtime`) is rejected in a Proxy file — Next 16 always runs
 * Proxy on the Node.js runtime, which is why importing the Drizzle-backed auth config here
 * is safe.
 */
export { auth as proxy } from '@/auth';

export const config = {
  // `/admin/*` needs the session gate; `/api/*` needs it for every mutating method except
  // the public lead POST. Public GETs stay outside the session lookup entirely.
  matcher: ['/admin/:path*', '/api/:path*'],
};
