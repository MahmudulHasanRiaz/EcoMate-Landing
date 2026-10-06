import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});

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
