import type { NextConfig } from 'next';

// Exposed only for the production `instant()` rig (Task 24): `next build` with
// `EXPOSE_TESTING_API=1` compiles the navigation-lock testing API into the
// artifact so `instant()` from `@next/playwright` can distinguish prefetched
// shell from streamed content. Real production builds leave it off.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16: replaces the old `experimental.ppr`. Enables Partial Prerendering so the
  // marketing page ships static shell + cached content, with only genuinely fresh parts
  // (consent state, locale) rendering per request.
  //
  // REQUIREMENT: with this on, `next build` prerenders the shell and runs every
  // `'use cache'` function at BUILD time, where there is no request and therefore no
  // Hyperdrive binding. `db/client.ts` (Task 3) handles that with a `DIRECT_URL`
  // fallback, and CI must expose `DIRECT_URL` to the build step (Task 8).
  cacheComponents: true,
  // Task 24: Partial Prefetching (Next >= 16.3). Default links warm the shared
  // App Shell (provider + `[locale]` layout); `prefetch={true}` additionally
  // resolves cached URL-specific content. No per-route `prefetch = 'partial'`
  // exports remain — the audit found zero `prefetch={true}` links, so there
  // was nothing to adopt incrementally and the flag lands directly.
  partialPrefetching: true,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
  },
  images: {
    remotePatterns: [
      // Production host, then the preview worker host (same-origin absolute media
      // URLs from the `/media` proxy). The old `ecomate-landing` worker keeps
      // serving dev.ecomate.bd as the preview/staging deployment.
      { protocol: 'https', hostname: 'ecomate.bd' },
      { protocol: 'https', hostname: 'dev.ecomate.bd' },
      // Reserved for a future dedicated R2 custom domain (`R2_PUBLIC_ORIGIN`).
      // `media.ecomate.app` does not resolve today; kept so already-stored absolute
      // URLs do not throw at render time if they ever do.
      { protocol: 'https', hostname: 'media.ecomate.app' },
    ],
  },
  /**
   * Admin HTML must never be stored by a browser or an intermediary: a cached `/admin`
   * document handed to the next user on a shared machine is a credential leak.
   *
   * `proxy.ts` also sets this on the middleware response, but Next overwrites
   * `Cache-Control` when it renders a dynamic page, so the router-level header is what
   * actually lands on the response (verified: `/admin` and `/admin/login` both return
   * `no-store, private`). The two together also cover API responses.
   */
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
      {
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
    ];
  },
  typedRoutes: true,
};
export default nextConfig;
