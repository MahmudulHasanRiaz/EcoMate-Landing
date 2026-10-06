# Incident: OpenNext build script recursed until the machine ran out of memory

| Field | Value |
|---|---|
| Date | 2026-10-06 |
| Severity | High — blocked all builds/deploys locally; hung the developer machine repeatedly |
| Status | Resolved |
| Components | `package.json` build script, `@opennextjs/cloudflare` / `@opennextjs/aws`, CI workflows |
| Fix commit | `df922a1` |
| Detection | Process-tree memory watchdog (see below) |

---

## 1. Summary

`package.json` declared `"build": "opennextjs-cloudflare build"`. The OpenNext build
pipeline resolves the **Next.js** build command itself as
`config.buildCommand ?? "npm run build"`. The `build` script *was* the OpenNext build, so
every build invoked itself. Each invocation spawned another `npm` → `opennextjs-cloudflare`
→ `next build` chain. A single `npm run build` was actually an unbounded tree of builds.

On a 16 GB machine that tree consumed tens of gigabytes (observed: ~75 GB of memory
pressure / swap) and froze the machine, repeatedly, within seconds of starting a build.
No diagnosis was possible while it was happening because the machine was unresponsive.

## 2. Impact

- Any `npm run build` / `npx opennextjs-cloudflare build` / CI build attempt hung the
  developer's Mac mini. Recovery required force-killing all Node processes.
- The same bug would have failed or hung **CI** (`ci.yml`) and the **deploy workflow**
  (`deploy.yml`), since both invoked `npm run build`.
- Agent-driven work sessions kept re-triggering it, making the machine unusable while
  unattended — the worst case, because nobody could intervene.

## 3. Root cause

`@opennextjs/aws` — `dist/build/buildNextApp.js`:

```js
export function buildNextjsApp(options) {
  const { config, packager } = options;
  const command = config.buildCommand ??
    (["bun", "npm"].includes(packager)
      ? `${packager} run build`      // <-- npm  ->  "npm run build"
      : `${packager} build`);
  cp.execSync(command, { stdio: "inherit", /* ... */ });
}
```

And the project's `package.json`:

```json
{
  "scripts": {
    "build": "opennextjs-cloudflare build"
  }
}
```

So: `opennextjs-cloudflare build` → (no `buildCommand` configured) → `npm run build` →
`opennextjs-cloudflare build` → … forever.

The build log made it visible once we captured it:

```
> react-example@0.0.0 build
> opennextjs-cloudflare build
  ┌ OpenNext — Building Next.js app ┐
  > react-example@0.0.0 build
  > opennextjs-cloudflare build
  ┌ OpenNext — Building Next.js app ┐
  > react-example@0.0.0 build
  > opennextjs-cloudflare build
  ...
```

### Why it escalated so fast

This is not a slow leak. Every level of recursion starts **new OS processes**
(an `npm` process, an `opennextjs-cloudflare` CLI process, a `next build` process), each
holding a few hundred MB of RSS. The depth is unbounded and the tree grows breadth-first,
so total memory is roughly `depth × branches × per-process RSS` — it crossed 3 GB within
seconds and kept climbing. macOS then swapped hard, which is what "hung the machine"
actually was.

## 4. Detection

Because the machine could not be inspected while frozen, the fix was driven by a
**process-tree memory watchdog** (`guard.sh`, kept out of the repo): it runs a command,
polls the summed RSS of its whole process tree once per second, and `SIGKILL`s the tree the
moment it exceeds a cap, logging the top consumers. A trap guarantees the tree dies even if
the watchdog's own parent is killed.

First run with a 3 GB cap:

```
[guard] cmd=npm run build max=3072MB
...
[guard] LIMIT EXCEEDED: 3299MB > 3072MB — killing tree
[guard] top consumers at kill time:
[guard]   pid=62846 rss=298MB node
[guard] ABORTED after peak=3299MB
```

The log also showed the repeated OpenNext banner — the smoking gun for the recursion.

## 5. Resolution

1. **`package.json`** — `build` is now `next build`; `preview`/`deploy` chain
   `opennextjs-cloudflare build` as the official docs specify. (Note: `opennextjs-cloudflare
   deploy` does **not** rebuild — it reads the compiled config and runs `wrangler deploy` —
   so the chain in the scripts is required, not redundant.)
2. **`open-next.config.ts`** — documents the hazard. The Cloudflare helper's
   `defineCloudflareConfig` types its argument as `CloudflareOverrides`, which does **not**
   expose `buildCommand`, so the invariant cannot be pinned from the config file.
3. **CI regression guard** — both `.github/workflows/ci.yml` and `deploy.yml` now run a
   blocking step that fails the pipeline if `package.json`'s `build` script ever calls
   `opennextjs-cloudflare build` again.
4. **Build steps** — CI runs `npx opennextjs-cloudflare build` (the CLI produces the
   deployable `.open-next` bundle; `npm run build` alone only produces `.next`).

### Two additional bugs found while fixing this

- **Wrong artifact path.** The workflows verified/uploaded `.opennext`, but the CLI writes
  `.open-next/worker.js`. Every CI run and deploy would have failed on a missing artifact.
  Corrected to `.open-next` in both workflows.
- **Prerender crash under Cache Components.** `/admin/cms` aborted the build with
  *"Next.js encountered uncached or runtime data during prerendering"* because it awaits
  `auth()` (cookies). Fixed with `export const instant = false` in `app/admin/layout.tsx` —
  the documented "blocking route" opt-in. Admin routes deliberately block on the session;
  streaming a shell would paint an unauthenticated admin UI before the redirect resolves.

## 6. Verification

With the watchdog in place:

| Command | Before fix | After fix |
|---|---|---|
| `npx tsc --noEmit` | — | peak **282 MB**, exit 0 |
| `npm run build` | **> 3 GB, killed** (recursing) | single build, peak **~1.4 GB**, exit 0 |
| `npx opennextjs-cloudflare build` | — | exit 0, writes `.open-next/worker.js`, prerenders `/robots.txt` + `/sitemap.xml` |

Later, once tagged `'use cache'` reads were added, the full OpenNext build peaked at
**~2.9 GB** — normal for a Next production build, and comfortably safe.

## 7. Prevention — the rules that came out of this

1. **Never let a build script invoke the tool that invokes it.** `npm run build` must run
   the framework's build (`next build`), never the wrapper. Enforced in CI.
2. **Bound every heavy command.** Run builds with a heap cap
   (`NODE_OPTIONS="--max-old-space-size=2048"`) and, ideally, under a memory watchdog so a
   runaway process kills itself instead of the machine.
3. **One heavy command at a time.** Parallel builds, dev servers and typechecks are how a
   16 GB machine reaches swap-thrash.
4. **Never leave a server running.** Always capture the PID and kill it in the same command;
   confirm the port is free afterwards.
5. **Path correctness is part of the contract.** `.open-next` (hyphen) is the artifact
   directory — a workflow that checks `.opennext` fails silently-until-deploy.

See also `AGENTS.md` at the repository root, which carries these rules for every agent and
contributor.

---

## 8. Short summary for a blog post (Bengali)

> **বিল্ড স্ক্রিপ্ট নিজেকেই ডাকছিল — আর মেশিন হ্যাং হয়ে যাচ্ছিল**
>
> Cloudflare Workers-এর জন্য Next.js বিল্ড করতে আমরা `@opennextjs/cloudflare` ব্যবহার
> করছিলাম। `package.json`-এ স্ক্রিপ্ট লিখেছিলাম এভাবে:
> `"build": "opennextjs-cloudflare build"`।
>
> সমস্যা হলো, OpenNext ভেতরে ভেতরে Next.js-এর বিল্ড কমান্ডটা নিজে ঠিক করে — ডিফল্ট
> হিসেবে সে `npm run build` চালায়। কিন্তু আমাদের `build` স্ক্রিপ্টটাই তো OpenNext-এর
> বিল্ড! ফলে ঘটলো অসীম recursion: `opennextjs-cloudflare build` → `npm run build` →
> আবার `opennextjs-cloudflare build` → আবার `npm run build` … এভাবে কখনো থামে না।
>
> প্রতিটা ধাপে নতুন নতুন Node প্রসেস জন্মায়, প্রতিটা কয়েকশো মেগাবাইট মেমোরি নেয়।
> মাত্র কয়েক সেকেন্ডেই মেমোরি ৩ জিবি ছাড়িয়ে যায়, আর একটু পরেই ১৬ জিবি মেশিনে ৭৫ জিবি
> পর্যন্ত মেমোরি প্রেশার তৈরি হয়ে মেশিন পুরো হ্যাং হয়ে যায়। সবচেয়ে খারাপ দিক — মেশিন
> হ্যাং থাকলে ডিবাগ করার সুযোগই থাকে না, তাই কী হচ্ছে বোঝা যায় না।
>
> **যেভাবে ধরা পড়ল:** আমরা একটা "মেমোরি ওয়াচডগ" স্ক্রিপ্ট বানালাম, যেটা কমান্ডের পুরো
> প্রসেস-ট্রির মেমোরি প্রতি সেকেন্ডে মেপে লিমিট ছাড়ালেই পুরো প্রসেস-ট্রি kill করে দেয়।
> লগে পরপর একই OpenNext বিল্ড মেসেজ বারবার দেখা যাওয়ায় recursion ধরা পড়ে যায়।
>
> **সমাধান:** `build` স্ক্রিপ্ট ঠিক করলাম — `"build": "next build"`। অর্থাৎ `npm run build`
> এখন শুধু Next.js-এর বিল্ড চালাবে; OpenNext-এর CLI আলাদাভাবে দরকারমতো
> `opennextjs-cloudflare build` চালাবে। ফিক্সের পর একটাই বিল্ড হয়, পিক ~১.৪ জিবি মেমোরি,
> নিরাপদ। ভবিষ্যতে কেউ যেন ভুলে আবার এটা না করে, সেজন্য CI-তে একটা ব্লকিং চেক যোগ
> করেছি, যেটা বিল্ড স্ক্রিপ্ট আবার recursion-এ পড়লে সাথে সাথে পাইপলাইন ফেল করবে।
>
> **শিক্ষা:** এজেন্ট/AI দিয়ে অটোমেটেড বিল্ড চালালে কমান্ডে একটা হার্ড মেমোরি লিমিট দিন,
> আর একসাথে একটার বেশি ভারী কাজ চালাবেন না। না হলে একটা ছোট কনফিগ ভুলই গোটা মেশিন
> অচল করে দিতে পারে।
