import type { NextConfig } from 'next';

// Exposed only for the production `instant()` rig (Task 24): `next build` with
// `EXPOSE_TESTING_API=1` compiles the navigation-lock testing API into the
// artifact so `instant()` from `@next/playwright` can distinguish prefetched
// shell from streamed content. Real production builds leave it off.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cache Components + Partial Prefetching are OFF (2026-10-07): with no incremental-cache
  // backend configured, opennext falls back to a "Dummy" cache whose `.set()` THROWS
  // ("Dummy cache does not cache anything") inside page renders on Workers — every page
  // 500'd or hung while APIs and static files worked. Dynamic render per request until
  // the cache backend exists; re-enable per docs/CACHE.md (needs R2/DO tag-cache bindings
  // proven on preview first, then flip this flag and restore the directives).
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
