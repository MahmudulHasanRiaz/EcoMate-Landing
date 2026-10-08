import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import doShardedTagCache from '@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache';

// Phase 3a (Item 16 / §8.6): R2 incremental cache + DO sharded tag cache.
//
// - `incrementalCache` persists `'use cache'` entries + prerendered shells in the
//   `NEXT_INC_CACHE_R2_BUCKET` bucket (wrangler.toml). Without this backend opennext
//   falls back to a Dummy cache whose `.set()` THROWS inside page renders — the
//   2026-10-07 outage that forced Cache Components off.
// - `tagCache` tracks `cacheTag` revalidation in the `NEXT_TAG_CACHE_DO_SHARDED`
//   Durable Object (auto-exported by the opennext worker template) so `updateTag`
//   from an admin mutation invalidates the R2 entries without a rebuild.
// - The DO factory is passed lazy (`() => T`): it is instantiated inside the Worker,
//   never at config-evaluation time on the build machine.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: doShardedTagCache,
});

// ---------------------------------------------------------------------------
// HAZARD: never point package.json's `build` script at `opennextjs-cloudflare build`.
//
// `@opennextjs/aws` resolves the Next build command as
// `config.buildCommand ?? "npm run build"` (build/buildNextApp.js). If the `build`
// script IS `opennextjs-cloudflare build`, the CLI invokes itself recursively: each
// level spawns another npm/node process until the machine exhausts memory and hangs.
//
// The Cloudflare adapter's `defineCloudflareConfig` does not expose `buildCommand`
// (its type only accepts cache/queue overrides), so the recursion cannot be pinned
// away from here. The invariant is instead:
//   - package.json: "build": "next build"
//   - CI: `.github/workflows/ci.yml` asserts that invariant and fails the build if
//     the script ever regresses.
// ---------------------------------------------------------------------------
