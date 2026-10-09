import type { NextConfig } from 'next';

// Exposed only for the production `instant()` rig (Task 24): `next build` with
// `EXPOSE_TESTING_API=1` compiles the navigation-lock testing API into the
// artifact so `instant()` from `@next/playwright` can distinguish prefetched
// shell from streamed content. Real production builds leave it off.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Phase 3a (Item 16 / §8.6): Cache Components + Partial Prefetching are ON.
  // Backend: R2 incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) + DO sharded tag
  // cache (`NEXT_TAG_CACHE_DO_SHARDED`) — see open-next.config.ts + wrangler.toml.
  // Public content prerenders static with tag-based on-demand invalidation
  // (docs/CACHE.md); admin/API stay dynamic. Build requires DIRECT_URL (CI passes
  // it) because prerendered `'use cache'` reads have no Hyperdrive binding.
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
