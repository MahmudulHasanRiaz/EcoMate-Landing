import type { NextConfig } from 'next';

// Exposed only for the production `instant()` rig (Task 24): `next build` with
// `EXPOSE_TESTING_API=1` compiles the navigation-lock testing API into the
// artifact so `instant()` from `@next/playwright` can distinguish prefetched
// shell from streamed content. Real production builds leave it off.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cache Components are OFF (2026-10-09 P0: `cacheComponents: true` hangs every cached
  // route on Workers with Error 1101 — see docs/muse/cache-components-off-directive.md).
  // Public content caches via the classic `unstable_cache` pipeline instead
  // (`lib/content.ts` + `revalidateTag` invalidation in `lib/revalidate.ts`).
  // Backend: R2 incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) + DO sharded tag
  // cache (`NEXT_TAG_CACHE_DO_SHARDED`) — see open-next.config.ts + wrangler.toml.
  // NOTE: `partialPrefetching: true` REQUIRES the flag (Next throws E1321 without it),
  // so it is off too until/unless Cache Components returns. `export const instant`
  // route configs (blog/case-study slugs, admin layout) are inert without the flag.
  // Build requires DIRECT_URL (CI passes it) because prerendered cached reads have
  // no Hyperdrive binding.
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
      // `media.ecomate.bd` after `wrangler r2 bucket domain` + DNS; already-stored
      // absolute URLs keep rendering through the same-origin proxy meanwhile.
      { protocol: 'https', hostname: 'media.ecomate.bd' },
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
