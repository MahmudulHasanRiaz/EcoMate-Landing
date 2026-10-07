/**
 * Next.js 16 renamed `middleware.ts` → `proxy.ts` and the required export from
 * `middleware()` → `proxy()`. Do not add a `middleware.ts`; v16 ignores it (with a
 * warning), which would silently remove every admin gate below.
 *
 * Auth.js v5's `auth` wrapper is a drop-in for either name. It reads the session cookie
 * and then consults `callbacks.authorized` in `auth.ts`, which holds the actual
 * public/private policy, the `Cache-Control: no-store` header for admin HTML and — since
 * Task 14 — the security headers (`lib/securityHeaders.ts`) that must ride on every
 * response. A bare `export { auth as proxy }` cannot add anything on top: attaching headers
 * requires building the response, and that happens in the callback.
 *
 * Segment config (`export const runtime`) is rejected in a Proxy file — Next 16 always runs
 * Proxy on the Node.js runtime, which is why importing the Drizzle-backed auth config here
 * is safe.
 *
 * ## Order of operations
 *
 * The `redirects` table is consulted *first* and the auth gate runs *after*, unchanged. That
 * ordering is deliberate and is not a weakening of the gate:
 *
 *  - A managed redirect answers before any session is read, so a moved marketing URL resolves
 *    whether or not the caller is an operator. Gating it behind auth would make the table
 *    useless for visitors, which is its entire purpose.
 *  - Redirects are matched **only** for `GET`/`HEAD` on document paths. A mutating API call
 *    can never be redirected: bouncing a `POST /api/leads` into a page would lose the lead.
 *    That exclusion is what keeps the gate equivalent for every path that has one.
 *  - `findManagedRedirect` fails **open** (returns `null` on any KV/DB error) and is memoised
 *    so an outage costs one query, not one per request. A redirect table can never take the
 *    site down — see `lib/redirects.ts`.
 */
import { NextResponse, type NextMiddleware, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { applySecurityHeaders } from '@/lib/securityHeaders';
import { DEFAULT_LOCALE, localeFromPathname } from '@/lib/locales';
import { findManagedRedirect } from '@/lib/redirects';
import { timed } from '@/lib/slowlog';

/**
 * `auth` is an intersection of five call signatures (server session, `getServerSideProps`,
 * App Route handler, middleware, …). Calling it positionally as `(request, event)` makes TS
 * resolve to the *first* overload — `NextApiRequest` — and reject `NextRequest`. This is an
 * overload-resolution problem in Auth.js' published types, not a real incompatibility: the
 * last signature in that intersection is exactly `(NextAuthMiddleware) => NextMiddleware`.
 *
 * Narrowing through `unknown` picks that signature explicitly. The runtime value is the same
 * `auth` the previous bare `export { auth as proxy }` used, so the gate is unchanged — the
 * alternative (wrapping with `auth(handler)`) would force the redirect check to run *after*
 * the session lookup, which is the opposite of what the redirect table needs.
 */
const authAsProxy = auth as unknown as NextMiddleware;

/** The language of the response body, as declared by `Content-Language`. */
function contentLanguageFor(pathname: string): string {
  return localeFromPathname(pathname) ?? DEFAULT_LOCALE;
}

/**
 * Mint the per-request correlation id (Task 20 §2).
 *
 * Prefers an inbound `cf-ray` so Worker logs join to the Cloudflare dashboard,
 * reuses a well-formed inbound `x-request-id` from a trusted caller, and mints
 * `crypto.randomUUID()` otherwise. The same value is set on the downstream
 * request (best effort — `NextRequest` headers may be read-only in some
 * runtimes, in which case handlers mint an equivalent id via `lib/request.ts`)
 * and echoed on every response as `x-request-id`.
 */
function mintRequestId(request: NextRequest): string {
  const inbound = (
    request.headers.get('cf-ray') ??
    request.headers.get('x-request-id') ??
    ''
  ).trim().slice(0, 120);
  if (inbound !== '' && /^[A-Za-z0-9._:-]+$/.test(inbound)) return inbound;
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function proxy(request: NextRequest, event: Parameters<NextMiddleware>[1]) {
  const requestId = mintRequestId(request);
  // Best-effort propagation so `lib/request.ts#requestId()` downstream reads the
  // same value. A read-only Headers implementation throws here — that is fine,
  // the handler falls back to its own equivalent id.
  try {
    request.headers.set('x-request-id', requestId);
  } catch {
    // Read-only headers in this runtime: ignore.
  }
  const { pathname } = request.nextUrl;

  // Document requests only, and never for a mutating verb.
  const isDocument = request.method === 'GET' || request.method === 'HEAD';
  if (isDocument && !pathname.startsWith('/api/') && !pathname.startsWith('/admin')) {
    // Timeout + failure-memo live INSIDE findManagedRedirect (5s bound, 10min memo
    // on timeout): a single slow backend costs one request, not every request. Do not
    // wrap another timeout here — nested timers only obscure which layer fired.
    const rule = await findManagedRedirect(pathname);
    if (rule) {
      const destination = new URL(rule.toPath, request.url);
      // Drop the query string rather than carrying it over: `to_path` is a path, and
      // concatenating an unknown query onto it would either leak UTM parameters onto an
      // unrelated page or produce an unparseable URL.
      destination.search = '';
      const response = NextResponse.redirect(destination, rule.statusCode);
      // A redirect is still a response, so it carries the same headers as any other. Without
      // this a 308 would ship without HSTS and without `frame-ancestors`, and a crawler
      // following it would briefly render an unguarded document.
      applySecurityHeaders(response.headers);
      response.headers.set('Content-Language', contentLanguageFor(pathname));
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('x-request-id', requestId);
      return response;
    }
  }

  // The auth gate itself: unchanged from the previous bare re-export. Every decision — the
  // admin session check, the mutating-method rule, the public lead POST exception, the
  // bootstrap endpoints, the security headers and the admin `no-store` — still happens inside
  // `auth.ts`'s `authorized` callback, so this wrapper adds only what it must.
  const response = await timed(
    Promise.resolve(authAsProxy(request, event)),
    `proxy:auth:${pathname}`,
    10000,
    { pathname },
  );

  // `auth` returns `undefined` when it answers the request itself (an unauthenticated
  // redirect to the sign-in page, or a 401 for an API call). There is no response object to
  // annotate in that case, and it is never a content document.
  if (response instanceof Response) {
    response.headers.set('Content-Language', contentLanguageFor(pathname));
    response.headers.set('x-request-id', requestId);
  }

  return response;
}

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