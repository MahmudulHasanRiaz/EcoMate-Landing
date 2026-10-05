import type { NextConfig } from 'next';

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
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'media.ecomate.app' }],
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
