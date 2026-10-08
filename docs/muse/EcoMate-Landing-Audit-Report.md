# EcoMate-Landing — গভীর সিকিউরিটি, কোড ও ইনফ্রা অডিট রিপোর্ট

**তারিখ:** ৮ অক্টোবর ২০২৬
**রিপোজিটরি:** `MahmudulHasanRiaz/EcoMate-Landing`
**অডিট ধরন:** Read-only (কোনো কোড পরিবর্তন করা হয়নি)
**অডিটর ভূমিকা:** Senior Engineer / Architect / Security Reviewer

---

## ১. এক্সিকিউটিভ সামারি

EcoMate-Landing একটি Next.js 16 (App Router) অ্যাপ, যা OpenNext দিয়ে Cloudflare Workers-এ চলে। ডেটাবেস Postgres (Drizzle ORM, Hyperdrive দিয়ে), মিডিয়া R2/S3-তে, অথ NextAuth v5। পাবলিক ল্যান্ডিং সাইট ১০০% ডায়নামিক CMS-ভিত্তিক, অ্যাডমিন প্যানেল থেকে ব্লগ, কেস স্টাডি, প্রজেক্ট, টেস্টিমোনিয়াল/রিভিউ, প্রাইসিং, মেনু, সেকশন কনটেন্ট সব ম্যানেজ করা যায়।

**ভালো খবর:** কোডবেসে পরিপক্ক ইঞ্জিনিয়ারিংয়ের ছাপ স্পষ্ট — session registry + live role re-read, TOTP encrypted at rest, PBKDF2 100k, কোনো mass assignment নেই, multi-table write-এ transaction, migration drift নেই, sanitization আছে, secret hygiene ভালো (SHA-pinned actions, gitleaks scan)। `tsc --noEmit` **শূন্য এরর**, `npm audit` **শূন্য vulnerability**।

**খারাপ খবর:** মোট **১৩৭টি ফাইন্ডিং**, যার মধ্যে **৬টি Critical** ও **১৮টি High**। সবচেয়ে উদ্বেগের বিষয় তিনটি:

1. **`GET /api/integrations/logs` সম্পূর্ণ পাবলিক** — কোনো লগইন ছাড়াই কাস্টমার লিডের নাম-ফোন-ইমেইলসহ পুরো ডাটাবেস এক রিকোয়েস্টে বের করে নেওয়া যায় (PII breach)।
2. **প্রিভিউ ডিপ্লয় প্রোডাকশন ডাটাবেসে বাঁধা** — `deploy.yml`-এ `preview` এনভায়রনমেন্ট সিলেক্ট করলেও মাইগ্রেশন/সিড/Hyperdrive সব প্রোডাকশন DB-তে চলে; প্রিভিউ অ্যাডমিন আসল কাস্টমার ডেটা দেখবে।
3. **লগইন ৫০০ + ইউজার এনুমারেশন** — পুরনো ৬০০k-iteration হ্যাশ Workers-এ throw করে; অজানা ইমেইলে ৫০০, ভুল পাসওয়ার্ডে ক্লিন ফেইল — ভ্যালিড অ্যাকাউন্ট চেনা যায়।

এছাড়া অ্যাডমিন API-র বড় অংশে **role guard অনুপস্থিত** (editor রোলে বসে প্রাইসিং/সেটিংস/মিডিয়া ডিলিট করা যায়), পাবলিক API থেকে **ড্রাফট/আনপাবলিশড কনটেন্ট লিক** হয়, খালি অ্যারে অ্যাডমিনে সেভ করলে **পুরো ল্যান্ডিং পেজ ক্র্যাশ** করে, cron job **দিনে ৯৬ বার** চলে (ডকুমেন্টেড "ডেইলি"-র বদলে), টেস্ট স্যুট **CI-তে কখনোই রান হয় না**।

| Severity | সংখ্যা (সিদ্ধান্ত-পূর্ব → পর) |
|---|---|
| 🔴 Critical | ৬ → ৬ |
| 🟠 High | ১৮ → **২০** (+২: testimonial multi-format, case-study write) |
| 🟡 Medium | ৪৭ → **৪৮** (+১: post-name permalink) |
| 🔵 Low | ৬৬ → ৬৬ |
| **মোট** | **১৩৭ → ১৪০** |

> §১.৫-এ মালিকের ১৬টি সিদ্ধান্তের পর ফাইন্ডিং আপডেট করা হয়েছে। যেসব ফাইন্ডিংয়ের fix-direction বদলেছে, সেগুলো §১.৫-এ "প্রভাব" হিসেবে নোট করা আছে।

**কীভাবে অডিট করা হয়েছে:** তিনটি স্পেশালিস্ট স্ট্রিম (পাবলিক সাইট / অ্যাডমিন+API+অথ / ডিপ্লয়মেন্ট পাইপলাইন) পুরো রিপো পড়ে প্রতিটি ফাইন্ডিং ফাইল:লাইন প্রমাণসহ যাচাই করেছে। পাশাপাশি `tsc --noEmit` ও `npm audit` চালানো হয়েছে।

---

## ১.৫ অডিট-পরবর্তী সিদ্ধান্ত লগ (মালিকের উত্তর, ৮ অক্টোবর ২০২৬)

অডিটের পর ১৬টি ফাইন্ডিং নিয়ে মালিককে প্রশ্ন করা হয়েছিল (যেগুলোতে রিকোয়ারমেন্ট হওয়ার সম্ভাবনা ছিল)। নিচে প্রতিটার সিদ্ধান্ত ও রিপোর্টে তার প্রভাব:

### সিদ্ধান্ত ১ — Editor রোল: CMS কনটেন্ট ম্যানেজ করবে
**সিদ্ধান্ত:** Editor শুধু read-only নয় — ব্লগ পোস্টিংসহ সব CMS-টাইপ কনটেন্ট কাজ editor-রা করবে। তবে পাবলিক সাইট কাস্টমাইজেশন ও অ্যাডভান্সড ফিচার editor-দের দেওয়া হবে না।
**প্রভাব (H-4–H-9 সংশোধিত):** blanket `requireAdminRole(['superadmin','admin'])` নয় — per-resource RBAC লাগবে। প্রস্তাবিত ম্যাট্রিক্স:
- **Editor CAN:** blog CRUD, case-study CRUD, testimonial CRUD, media library (upload/list/delete), lead দেখা/স্টেটাস আপডেট
- **Editor CANNOT (admin-only):** pricing plans + toggle-mode, site settings, sections (landing content = সাইট কাস্টমাইজেশন), social links, users/roles, integrations/logs, sync-license/sync-meta (H-2/H-3 — এগুলো মার্কেটিং-সিদ্ধান্ত লেভেলের), setup

### সিদ্ধান্ত ২ — Rate limiting: চাই, কিন্তু নতুন Cloudflare সার্ভিস নয়
**সিদ্ধান্ত:** Rate limiting অবশ্যই implement করতে হবে, Next.js full-stack-এর ভেতরেই। কিন্তু KV বা অন্য কোনো নতুন Cloudflare (paid) সার্ভিস যোগ করা যাবে না — শুধু R2 + Pages/Workers + Turnstile।
**প্রভাব (H-13/M-12 সংশোধিত):** KV re-bind বাতিল। নতুন ফিক্স: Postgres sliding-window counter (Hyperdrive দিয়ে) — auth ও lead endpoint-এ DB-backed distributed limiting + in-isolate in-memory backstop + Turnstile। KV/Durable Objects ছাড়া Workers-এ true distributed limiting অসম্ভব — এই সীমাবদ্ধতা ডকুমেন্টেড থাকবে।

### সিদ্ধান্ত ৩ — Turnstile: hybrid fail policy (সিদ্ধান্ত অডিটরের)
**সিদ্ধান্ত (মালিক delegate করেছেন):** রিয়েল ইউজ কেস = SaaS লিড ফর্ম, বাংলাদেশি কাস্টমার, বিরক্ত করা যাবে না; আবার যতটুকু প্রোটেকশন বাস্তবে দরকার ততটুকু চাই। Turnstile managed widget invisible — legit ইউজার বিরক্ত হয় না। তাই:
- Token verdict **invalid/bad** → **fail-closed** (reject — স্প্যাম আটকাবে)
- Cloudflare-এর সাথে **network/config error** → **fail-open + loud alert** (একটা লিড হারানোর চেয়ে স্প্যাম সস্তা)
- Sustained skip rate-এ alert (M-13-এর মনিটরিং)
**প্রভাব (M-13/L-31 সংশোধিত):** বর্তমান "সব error-এ fail-open" বদলে উপরের hybrid policy।

### সিদ্ধান্ত ৪ — Caching: "dynamic" মানে configurable, not no-cache
**সিদ্ধান্ত:** "১০০% ডায়নামিক" বলতে বোঝানো হয়েছে অ্যাডমিন প্যানেল থেকে configurable/changeable — caching বাদ দেওয়া নয়। বরং Next.js-এর সর্বোচ্চ লেভেলের smart caching ব্যবহার করতে হবে + সর্বোচ্চ পারফরম্যান্স/স্পিড বাধ্যতামূলক।
**প্রভাব (M-25/M-26/L-30 সংশোধিত → নতুন High সুপারিশ):** "caching off" decision বাতিল। নতুন আর্কিটেকচার: public page-এ ISR + admin publish-এ on-demand revalidation, static section server component-এ, per-locale code splitting (১০০ KB copy client bundle থেকে সরানো), `open-next.config.ts`-এ cache backend ফেরানো। এটা এখন **High priority** (পারফরম্যান্স মালিকের explicit requirement)।

### সিদ্ধান্ত ৫ — Dead dependency: সরিয়ে ফেলো
**সিদ্ধান্ত:** `@google/genai`, `@aws-sdk/client-s3` সরাও (ভবিষ্যতে AI লাগলে শুরু থেকে করা হবে); `dotenv` → `devDependencies`-তে সরাও।
**প্রভাব (M-27/L-29/L-22 সংশোধিত):** action = remove, "keep for future" নয়।

### সিদ্ধান্ত ৬ — Preview environment: সম্পূর্ণ সরিয়ে ফেলো
**সিদ্ধান্ত:** Preview দরকার নেই — নিরাপদে সরাও যেন production pipeline না ভাঙে।
**প্রভাব (CR-3/M-15/L-28/M-8 সংশোধিত):** Decommission plan: `preview.yml` workflow মুছো → `deploy.yml` থেকে `preview` env choice সরাও → `wrangler.toml` থেকে `[env.preview]` সরাও → preview secret (`PREVIEW_*`) cleanup → প্রতিটা ধাপে production deploy smoke-test করো। CR-3-এর "branching" ফিক্স বাতিল।

### সিদ্ধান্ত ৭ — তিনটা secret: অডিটরের সিদ্ধান্ত
**সিদ্ধান্ত (মালিক delegate করেছেন):** যাচাই করে দেখা গেছে `NOTIFY_FROM/TO_EMAIL` = Resend lead-notification-এর sender/recipient (নতুন লিড এলে সেলস টিমকে ইমেইল)। `LICENSE_PORTAL_API_BASE_URL` = ভবিষ্যৎ license-portal integration-এর base URL।
- তিনটাকেই `deploy.yml`-এর push list-এ plain config হিসেবে যোগ করো + RUNBOOK-এ ডকুমেন্ট করো ("single source of truth = GitHub Secrets" ঠিক রাখতে)।
- License-portal: এখনই full integration নয়, কিন্তু `lib/licensePortal.ts` abstraction-টা **ভবিষ্যৎ third-party integration-এর template** হিসেবে রেখে দাও + H-2-এর idempotency-key ফিক্স করো (ভবিষ্যৎ integration-এ লাগবেই)।
- Lead REST fundamentals: lead dispatch pipeline-এ clean integration point + idempotent POST রাখো, যাতে third-party-তে পাঠানো পরে সহজ হয়।

### সিদ্ধান্ত ৮ — `/api/ready`: পাবলিকই থাকবে, কিন্তু হালকা করে (সিদ্ধান্ত অডিটরের)
**ব্যাখ্যা:** এটা visitor analytics নয় — এটা **uptime monitoring**: "সাইট কি up আছে?" — বাইরের monitor সার্ভিস (যেমন cron job বা status page) auth ছাড়া ping করে। Auth বসালে monitor-ই কাজ করবে না।
**সিদ্ধান্ত:** দুটো endpoint-ই পাবলিক থাকবে, কিন্তু:
- `/api/health` = সস্তা 200 (কোনো DB/R2 probe নয়)
- `/api/ready` = probe-সহ, কিন্তু throttled/cached + error detail strip করে
**প্রভাব (L-2/H-12 সংশোধিত):** "gate করো" বাতিল; post-deploy verification এই public `/api/ready`-ই ব্যবহার করবে।

### সিদ্ধান্ত ৯ — Media: signed-URL flow + পূর্ণাঙ্গ media library UI
**সিদ্ধান্ত (মালিক):** আধুনিক signed-URL সিস্টেম — ব্রাউজার সরাসরি R2-তে upload করবে (presigned PUT), backend হালকা থাকবে; delivery-ও backend দিয়ে load না করে। অ্যাডমিন প্যানেলে proper media library UI থাকবে — সব image/media এখান থেকে manage করা যাবে।
**প্রভাব (L-4 সংশোধিত → নতুন High সুপারিশ):**
- `GET /api/media` (listing) → auth-gated (editor+; সিদ্ধান্ত ১ অনুযায়ী editor-দের media manage করতে হবে — বর্তমান upload route-এর superadmin/admin-only **too strict**, editor-কে allow করতে হবে)
- নতুন: presigned-URL upload flow (backend শুধু signed URL দেয় + metadata রেকর্ড করে; ফাইল বাইট backend দিয়ে যায় না)
- Delivery: signed GET URL বা `/media` proxy — backend streaming নয়

### সিদ্ধান্ত ১০ — Draft preview: admin-gated mechanism (সিদ্ধান্ত অডিটরের)
**সিদ্ধান্ত (মালিক প্রশ্ন বোঝেননি, অডিটর সিদ্ধান্ত):** রিয়েল ইউজ কেস = publish-এর আগে admin-কে draft দেখতে হবে। সঠিক প্যাটার্ন: public endpoint নয় — session-চেক করা admin-only preview route/mechanism।
**প্রভাব (M-1–M-5 অপরিবর্তিত):** public GET-এ `status='published'` ফিল্টার বসবেই; draft preview-এর জন্য আলাদা authenticated preview পথ বানাতে হবে।

### সিদ্ধান্ত ১১ — Testimonials: multi-format, confirmed requirement → নতুন High ফাইন্ডিং
**সিদ্ধান্ত (মালিক):** অবশ্যই রিকোয়ারমেন্ট ছিল। Testimonial কয়েক ধরনের হবে — video (short-form + standard/YouTube format), image testimonial, text+image — প্রতিটার optional/required field, sales-friendly, admin থেকে CRUD + নিয়মিত update।
**যাচাই:** `app/api/testimonials/route.ts`-এ শুধু GET আছে, POST নেই (কোডে confirmed); `app/api/case-studies/route.ts`-তেও শুধু GET।
**নতুন ফাইন্ডিং:**
- **H-19 (High, নতুন) — Testimonial write endpoint + multi-format support নেই।** Schema-তে `testimonialCreate/Update` আছে কিন্তু consuming route নেই। মালিক-confirmed requirement অনুযায়ী video (short/standard), image, text+image ফরম্যাট + per-type field + full CRUD বানাতে হবে।
- **H-20 (High, নতুন) — Case-study write endpoint নেই।** "সবকিছু অ্যাডমিন থেকে পোস্ট করা যাবে" রিকোয়ারমেন্ট অনুযায়ী case-study CRUD বাকি আছে।

### সিদ্ধান্ত ১২ — Error tracking: implement করো (শর্তসাপেক্ষে approved)
**সিদ্ধান্ত (মালিক):** Cloudflare Pages/Workers-এ deploy-এ অসুবিধা না হলে + capable করে বানানো গেলে অবশ্যই use করো।
**প্রভাব (H-14 সংশোধিত):** Sentry implement করো — এটা third-party (Cloudflare paid সার্ভিস নয়), free tier, Workers-এ চলে। Alternative হিসেবে Resend দিয়ে critical-error email alert (Resend ইতিমধ্যে আছে) — কিন্তু stack trace/source map-এর জন্য Sentry-ই সঠিক।

### সিদ্ধান্ত ১৩ — Domain: ecomate.bd canonical
**সিদ্ধান্ত (মালিক):** `ecomate.bd`-ই আসল ডোমেইন; `ecomate.app` ইত্যাদি এজেন্টের ভুল — সরাও। Media-র জন্য `ecomate.bd`-র subdomain (যেমন `media.ecomate.bd`) ব্যবহার করা যাবে, এবং deployment workflow নিজেই সেটা bind করবে।
**প্রভাব (M-18 সংশোধিত):** RUNBOOK/docs থেকে `ecomate.app` রেফারেন্স সরাও; R2 custom domain = `media.ecomate.bd`, deploy workflow-এ binding step যোগ করো (L-32-এর fix-ও এটাই)।

### সিদ্ধান্ত ১৪ — Meta CAPI: two-mode configurable (মালিকের বিস্তারিত spec)
**সিদ্ধান্ত (মালিক):** Admin setting-এ configurable হবে:
- **(a) Instant mode:** lead submit-এর সাথে সাথেই browser-side + server-side থেকে Lead event Meta-তে যাবে।
- **(b) Validated mode:** admin কোনো একটা lead status configure করে দেবে — শুধু ওই status-এ update হলে তবেই server-side থেকে **full Lead event** যাবে। Submit-এর সময় যাবে ভিন্ন একটা **হালকা instant event** (যাতে Meta AI বোঝে ডেটা পেয়েছে, কিন্তু full lead data নয়)।
- Lead event-এ সব ডেটা পাঠানো হবে না — data minimization, যাতে ভালো লিডের signal Meta শেখে।
- Tracking opt-out-কে retry-ও মানবে: **হ্যাঁ** (documented invariant বহাল)।
**প্রভাব (H-1 পুনর্লিখিত):** শুধু consent bug-fix নয় — ফিচার spec: `trackingConsent` persist + admin settings (`meta_capi_mode`, `meta_validated_status`, `meta_instant_event_name`) + দুই পথের dispatch লজিক + Lead event field allowlist।

### সিদ্ধান্ত ১৫ — Locale toggle: `/{locale}`-তে navigate করবে (সিদ্ধান্ত অডিটরের)
**সিদ্ধান্ত:** `instant-nav.rig.md`-এ client-state toggle বর্তমান contract হিসেবে ডকুমেন্টেড হলেও, hreflang/SEO investment-এর সাথে এটা সাংঘর্ষিক (URL `/en` থেকে Bangla দেখালে share/bookmark/crawl সব ভাঙে)।
**প্রভাব (M-29 সংশোধিত):** toggle-এ client router দিয়ে `/{locale}`-তে push করো — "junk" নয়, update দরকার।

### সিদ্ধান্ত ১৬ — `#tour`: dead menu item সরাও (সিদ্ধান্ত অডিটরের)
**সিদ্ধান্ত:** "Platform Tour" (`#tour`) — কোনো section নেই। Real section বানানোর আগে dead লিঙ্ক রাখার মানে নেই (UX/SEO ক্ষতি)।
**প্রভাব (M-46 সংশোধিত):** seed content থেকে item সরাও; ট্যুর সেকশন বানালে তখন ফিরিয়ে আনো।

### নতুন confirmed requirement — Post-name permalink strategy
**সিদ্ধান্ত (মালিক):** পুরো অ্যাপে post-name permalink maintain করতে হবে — slug/URL সবসময় post name থেকে, numeric ID public URL-এ কখনো নয়।
**প্রভাব (নতুন Medium):** `app/[locale]/blog/[idOrSlug]`, case-studies — ID fallback সরিয়ে slug-only করো (পুরনো ID URL → 301 redirect to slug)। Slug post title থেকে auto-generate + unique হতে হবে।

**সংশোধিত সংখ্যা:** 🔴 ৬ Critical, 🟠 **২০** High (+২), 🟡 **৪৮** Medium (+১ permalink), 🔵 ৬৬ Low = **মোট ১৪০**

---
## ২. 🔴 Critical ফাইন্ডিংস (অবিলম্বে ফিক্স করা দরকার)

### CR-1 — পাবলিক API থেকে লিড PII ডাম্প: `GET /api/integrations/logs`
- **ফাইল:** `app/api/integrations/logs/route.ts:14-33`
- **সমস্যা:** এই রুটে কোনো `requireAdminRole` বা session চেক নেই। `proxy.ts` শুধু mutating `/api/*` মেথড গেট করে, তাই এই GET রিকোয়েস্ট বিনা বাধায় পাস করে।
- **কেন ভয়াবহ:** `lib/licensePortal.ts:194-200` (`recordOutcome`) ডিসপ্যাচ পেলোডের পুরোটা — নাম, ফোন, ইমেইল, ভলিউম, UTM — `integration_logs.payload`-এ স্টোর করে, আর `.select()` সব কলাম রিটার্ন করে। মানে **লগইন ছাড়াই এক রিকোয়েস্টে পুরো কাস্টমার ডাটাবেস বের করে নেওয়া যায়** — GDPR/BD-PDPA লঙ্ঘন।
- **ফিক্স:** অবিলম্বে `requireAdminRole(['superadmin','admin'])` যোগ করো; লগ পেলোড থেকে PII redact করার কথা ভাবো।

### CR-2 — লগইনে ৫০০ এরর + ইউজার এনুমারেশন (Workers-এ)
- **ফাইল:** `auth.ts:100-103`, `lib/password.ts`
- **সমস্যা:** `TIMING_EQUALIZER_HASH` এখনো `pbkdf2$600000$…` ফরম্যাটে, অথচ কমিট `cf6b5c4`-এ iteration 600k → 100k করা হয়েছিল শুধু `lib/password.ts`-এ। Workers প্ল্যাটফর্মে 100k-এর বেশি iteration সাপোর্ট করে না, ফলে **অজানা ইমেইলে লগইন করলেই 500 throw হয়**, কিন্তু আসল অ্যাকাউন্টে ভুল পাসওয়ার্ড দিলে ক্লিনভাবে ফেইল করে — ফলে **ভ্যালিড অ্যাকাউন্ট কোনগুলো, বাইরে থেকে বোঝা যায়** (enumeration oracle)। এমনকি Node-তেও অজানা-ইমেইল প্রতি চেষ্টায় ৬× CPU খরচ (DoS ভেক্টর)।
- **ফিক্স:** equalizer hash 100k iteration-এ regenerate করো; `verifyPassword`-এ defensive catch যোগ করো।

### CR-3 — `deploy.yml`-এ preview এনভায়রনমেন্ট প্রোডাকশন DB-তে বাঁধা
- **ফাইল:** `.github/workflows/deploy.yml` ("Apply DB migrations", "Seed baseline content", "Ensure Hyperdrive config")
- **সমস্যা:** ওয়ার্কফ্লোতে `environment: [production, preview]` অপশন থাকলেও migration, seed, Hyperdrive স্টেপ সবসময় `secrets.DIRECT_URL` (production) ব্যবহার করে। `environment=preview` সিলেক্ট করলে Hyperdrive কনফিগ `ecomate-db-preview` নামে **প্রোডাকশন URL থেকে** তৈরি হয়, প্রোড DB-তে migration/seed চলে, তারপর প্রিভিউ Worker সেই প্রোড DB-র বিরুদ্ধে ডিপ্লয় হয়। বিল্ড জবও `DIRECT_URL` পাস করে env নির্বিশেষে।
- **কেন ভয়াবহ:** একটা ড্রপডাউন সিলেকশনেই environment isolation ভেঙে যায় — প্রিভিউ অ্যাডমিন আসল কাস্টমার লিড দেখবে, প্রিভিউ ট্রাফিক প্রোড ডেটায় লিখবে।
- **ফিক্স:** input অনুযায়ী `secrets.DIRECT_URL` বনাম `secrets.PREVIEW_DIRECT_URL` সিলেক্ট করো (যেমন `preview.yml`-এ আছে), preview URL unset থাকলে fail করো। অথবা `deploy.yml` থেকে `preview` অপশন সরিয়ে দাও — PR প্রিভিউ `preview.yml`-এর দায়িত্ব।

### CR-4 — খালি `problems` অ্যারে পুরো ল্যান্ডিং পেজ ক্র্যাশ করে
- **ফাইল:** `src/components/ComplexitySection.tsx:10`, `:141`
- **সমস্যা:** `useState<ProblemItem>(content.complexity.problems[0])` — গার্ড ছাড়া index 0 dereference; লাইন 141-এ `selectedProblem.id` রেন্ডারে throw করে।
- **কেন ভয়াবহ:** `lib/merge.ts` DB থেকে অ্যারে wholesale replace করে, তাই অ্যাডমিন একবার খালি `problems` সেভ করলেই **পুরো মার্কেটিং সাইট ডাউন** (client-rendered `LandingShell`-এর ভেতর)।
- **ফিক্স:** `problems[0] ?? null` দিয়ে init করো, state টাইপ `ProblemItem | null`, deep-dive কার্ড শুধু non-null হলে রেন্ডার করো।

### CR-5 — খালি `nodes` অ্যারে পুরো ল্যান্ডিং পেজ ক্র্যাশ করে
- **ফাইল:** `src/components/EcosystemSection.tsx:23`, `:40`, `:86`
- **সমস্যা:** `useState<string>(content.ecosystem.nodes[0].id)` — সম্ভাব্য undefined-এর `.id`। লাইন 40-এর fallback-ও undefined হতে পারে, লাইন 86-এ `activeNode.id` পড়ে।
- **ফিক্স:** `nodes[0]?.id ?? null`, nullable state, `activeNode` undefined হলে early-return fallback কার্ড।

### CR-6 — ছোট `pipeline` অ্যারে পুরো ল্যান্ডিং পেজ ক্র্যাশ করে
- **ফাইল:** `src/components/FulfillmentPipelineSection.tsx:19`, `:152`
- **সমস্যা:** `useState(2)` হার্ডকোডেড index 2; DB-তে ৩-এর কম step থাকলে `currentStep` undefined হয়ে `currentStep.stepNumber` throw করে।
- **ফিক্স:** initial index clamp করো (`Math.min(2, pipeline.length - 1)`), deep-dive কার্ডে `currentStep` গার্ড দাও।

> **প্যাটার্ন নোট:** CR-4/5/6 একই রুট কজ — CMS কনটেন্টকে কখনো "অসম্পূর্ণ হতে পারে" ধরে কোড লেখা হয়নি। অ্যাডমিন প্যানেলে যেকোনো সেকশনের ডেটা মুছে/খালি করলেই পাবলিক সাইট 500 দেবে। সব dynamic section-এ defensive guard বাধ্যতামূলক।

---
## ৩. 🟠 High ফাইন্ডিংস

### অ্যাডমিন/API/অথ

**H-1 — Meta CAPI retry-তে consent bypass: tracking opt-out ভিজিটরের ইভেন্ট আবার পাঠানো হয়**
`app/api/leads/[id]/sync-meta/route.ts:16` → `dispatchLeadIntegrations(id, {licensePortal:false})`, কোনো consent re-check ছাড়াই। `lib/leadDispatch.ts:108`-এর `hasTrackingConsent` শুধু `consentGiven` (contact consent, যা সব লিডেরই থাকে) টেস্ট করে — tracking opt-out শুধু `metaCapiStatus='Skipped'` টেক্সট হিসেবে থাকে, আর `:54` `Skipped` রো-ও পার হতে দেয়। ডকুমেন্টেড invariant ("opted-out ভিজিটরের Meta-তে কখনো dispatch হবে না") ভাঙে।
**ফিক্স:** insert-এর সময় `trackingConsent` boolean persist করো; প্রতিটা dispatch path-এ false হলে refuse করো।

**H-2 — `POST /api/leads/[id]/sync-license`: role check নেই, idempotency নেই**
`app/api/leads/[id]/sync-license/route.ts:8-17` — ডকুমেন্টেড read-only `editor`-ও ট্রিগার করতে পারে। `retryLead`→`dispatchLead` কখনো `licensePortalStatus` চেক করে না, portal-এ idempotency key ছাড়া POST করে (`:88-96`) — repeat call-এ **ডুপ্লিকেট লাইসেন্স**; portal-এর `rawResponse` কলারকে echo করে (`:121-126`)।
**ফিক্স:** `requireAdminRole(['superadmin','admin'])`, non-`Failed`/`Pending` রো refuse করো, `Idempotency-Key` যোগ করো, `rawResponse` রিটার্ন বন্ধ করো।

**H-3 — `POST /api/leads/[id]/sync-meta`: role check নেই** (`app/api/leads/[id]/sync-meta/route.ts:11-25`)। H-2-এর মতোই; editor জোর করে CAPI re-send করতে পারে। দুটো sync রুটেই `hitLimit` যোগ করো।

**H-4 — Pricing plan mutation-এ role guard নেই**
`app/api/pricing/route.ts:27` (POST), `app/api/pricing/[id]/route.ts:8` (PUT), `:40` (DELETE — hard delete, unaudited)। যেকোনো signed-in editor প্ল্যান বানাতে/বদলাতে/মুছতে পারে।
**ফিক্স:** `requireAdminRole(['superadmin','admin'])`।

**H-5 — `POST /api/pricing/toggle-mode`: role guard নেই** (`app/api/pricing/toggle-mode/route.ts:7`) — সাইট-ওয়াইড `is_pricing_visible` ফ্লিপ করা যায়। একই ফিক্স।

**H-6 — `PUT /api/sections/[id]`: role guard নেই** (`app/api/sections/[id]/route.ts:9`)। একই ফিক্স।

**H-7 — `PUT /api/settings`: role guard নেই** (`app/api/settings/route.ts:19`)। একই ফিক্স।

**H-8 — Social-link mutation-এ role guard নেই** (`app/api/social-links/route.ts:37,61,87`)। ফাইল হেডারে দাবি "proxy.ts gates mutating methods" — কিন্তু সেই গেট session-only, role-based নয়। Editor ফুটারে লিঙ্ক যোগ/বদল/মুছতে পারে (phishing-link ভেক্টর)। একই ফিক্স।

**H-9 — Media mutation-এ role guard নেই**
`app/api/media/route.ts:45` (POST), `app/api/media/[id]/route.ts:27` (DELETE — soft-delete + R2 অবজেক্ট purge, unaudited)। যেকোনো editor মিডিয়া অ্যাসেট ধ্বংস করতে পারে। (লক্ষণীয়: `app/api/media/upload/route.ts:146`-এ superadmin/admin required — এই inconsistency-টাই বাগ।)

> **প্যাটার্ন নোট:** H-4–H-9 কোডবেসের সবচেয়ে বারবার ঘটা defect class — `proxy.ts`-এর session gate-কে role gate ভেবে ভুল করা হয়েছে। ৯টা mutating handler-এ `requireAdminRole(['superadmin','admin'])` যোগ করাই সবচেয়ে বড় single win।

### ডিপ্লয়মেন্ট পাইপলাইন

**H-10 — cron-এর DAILY retention job প্রতি ১৫ মিনিটে চলে**
`.github/workflows/cron.yml` — দুটো schedule (`17 3 * * *` ও `*/15 * * * *`) একই `fire` job ট্রিগার করে, যা প্রতিটা tick-এ তিনটা রুটই (`retention`, `publish`, `dispatch-drain`) কল করে। হেডার কমেন্টে "daily 03:17 UTC" লেখা — বাস্তবে দিনে ~৯৬ বার চলে। retention job-টা unbounded `UPDATE leads ... RETURNING` (কোনো `LIMIT` নেই) + session-table delete — প্রোডাকশন পুলে ৯৬× লোড।
**ফিক্স:** schedule অনুযায়ী আলাদা job-এ ভাগ করো; retention শুধু daily tick-এ।

**H-11 — টেস্ট স্যুট আছে কিন্তু CI-তে কখনো রান হয় না**
`.github/workflows/ci.yml` — `tests/`-এ ৯টা টেস্ট ফাইল, `vitest.config.ts`-এ coverage floor (lines 27 / functions 18 / branches 18 / statements 26) — কিন্তু কোনো workflow-তে `npm test` নেই। `deploy.yml`-এও শুধু typecheck, টেস্ট নেই।
**ফিক্স:** `ci.yml`-এ `vitest run --coverage` স্টেপ যোগ করো (unit test-এ DB লাগে না)।

**H-12 — প্রোডাকশন ডিপ্লয়ে post-deploy verification ও rollback নেই**
`.github/workflows/deploy.yml` — deploy-এর পর শুধু echo confirmation। `/api/health` ও `/api/ready` (দুটোই এই কাজের জন্য বানানো) চেক করা হয় না; smoke test নেই (preview-এ Playwright smoke আছে, production-এ নেই)। Rollback `docs/RUNBOOK.md`-এ ম্যানুয়াল `wrangler rollback` হিসেবে ডকুমেন্টেড, কিন্তু **"UNVERIFIED — never performed"** ফ্ল্যাগসহ।
**ফিক্স:** post-deploy-এ `https://ecomate.bd/api/ready` 200 না হওয়া পর্যন্ত poll করো (~৩ মিনিট timeout); `wrangler rollback` drill করে ডকুমেন্ট করো।

**H-13 — প্রোডাকশনে rate limiting কার্যত অনুপস্থিত**
তিন স্তরের ডিজাইন ছিল: WAF rate rules → KV counters → per-isolate in-memory backstop। বাস্তবতা: KV decision দিয়ে সরানো হয়েছে (fail-open), RUNBOOK §5 বলে ছয়টা WAF rule-এর **"UNVERIFIED — none of these rules exist yet"**। শুধু per-isolate in-memory backstop আছে, যা Workers isolate জুড়ে কাজ করে না — distributed attacker সহজে এড়ায়।
**ফিক্স:** কমপক্ষে lead form, auth, cron-এর WAF rule Cloudflare dashboard-এ বানাও; KV namespace ফিরিয়ে আনো বা WAF-only posture স্পষ্টভাবে accept করো।

**H-14 — error tracking ও alerting নেই**
`SENTRY_DSN` declare করা (`cloudflare-env.d.ts`) কিন্তু **কোনো কোড পড়ে না**। Observability = Workers Logs + `wrangler tail`। Lead-success-rate alert-এর "no evaluator exists"; uptime monitor "operator বানাবে" — কিছুই নেই; incident contacts খালি।
**ফিক্স:** §16.1-এর দুটো monitor বানাও (আগে M-সংক্রান্ত URL/body mismatch ঠিক করে), evaluator wire করো, contacts পূরণ করো।

### পাবলিক সাইট

**H-15 — `<html lang="en">` হার্ডকোডেড; সব `/bn/*` পেজ ভুল document language ঘোষণা করে**
`app/layout.tsx:89-90` — root layout `lang="en"` হার্ডকোড করে। `LocaleThemeProvider.tsx:194` শুধু post-hydration client effect-এ ঠিক করে, তাই `/bn`, `/bn/blog/*` ইত্যাদির SSR HTML `lang="en"` নিয়ে যায়; no-JS crawler/assistive tech চিরকাল ভুল language দেখে। স্ক্রিন রিডার বাংলা টেক্সটে English pronunciation প্রয়োগ করে।
**ফিক্স:** SSR HTML-এ locale emit করো (যেমন `proxy.ts`-এ request-এ locale stamp করে root layout-এ পড়া)।

**H-16 — হেডার nav ক্লিক non-anchor URL-এ throw করে**
`src/components/Header.tsx:22-27` — `scrollToSection` বিনা শর্তে `e.preventDefault()` + `document.querySelector(href)` চালায়। মেনু DB-driven; `href` external URL বা path হলে (যেমন `/en/blog/x`) valid CSS selector নয় — `querySelector` uncaught `SyntaxError` throw করে, navigation-এর বদলে ক্র্যাশ।
**ফিক্স:** `href` `#` দিয়ে শুরু হলেই smooth-scroll path চালাও, নইলে native navigate হতে দাও; `querySelector` try/catch-এ মোড়ো।

**H-17 — Consent banner-এর Privacy Policy লিঙ্ক 404 দেয়**
`components/ConsentBanner.tsx:77` — লিঙ্ক হার্ডকোডেড `/privacy`, কিন্তু privacy রুট শুধু `app/[locale]/privacy`-তে; `proxy.ts`-এ unprefixed rewrite নেই — `/privacy` root `not-found.tsx`-এ পড়ে। আইনত প্রয়োজনীয় consent banner মৃত legal পেজে লিঙ্ক করে — সংগৃহীত consent-এর validity-ই প্রশ্নবিদ্ধ।
**ফিক্স:** locale-prefixed path (`/${locale}/privacy`) ব্যবহার করো।

**H-18 — Consent banner `/bn`-তে সম্পূর্ণ ইংরেজি**
`components/ConsentBanner.tsx:68-96` — সব কপি ("We value your privacy", "Accept all"…​) হার্ডকোডেড English। বাংলা ভিজিটর হয়তো না-বোঝা ভাষায় legal consent দিচ্ছে।
**ফিক্স:** banner string locale content seed থেকে নাও।

---
## ৪. 🟡 Medium ফাইন্ডিংস (৪৭টি)

### ৪.১ অ্যাডমিন/API/ডেটা (১৩টি)

| # | সমস্যা | লোকেশন | ফিক্স |
|---|---|---|---|
| M-1 | পাবলিক blog index ড্রাফট/শিডিউলড/আর্কাইভড পোস্ট লিক করে (শুধু `deletedAt` ফিল্টার) | `app/api/blog/route.ts:22` | `status='published'` ফিল্টার যোগ করো |
| M-2 | Single-post GET slug দিয়ে ড্রাফট লিক করে | `app/api/blog/[idOrSlug]/route.ts:31` | একই ফিক্স |
| M-3 | পাবলিক section GET ড্রাফট পেলোড লিক করে (list endpoint ফিল্টার করে, এটা করে না) | `app/api/content/[sectionKey]/route.ts:43` | `status='published'` ফিল্টার |
| M-4 | Testimonials GET `isPublished` উপেক্ষা করে — আনপাবলিশড ক্লায়েন্ট কোট/নাম লিক | `app/api/testimonials/route.ts:9` | `eq(isPublished, true)` |
| M-5 | Case-studies GET `isPublished` উপেক্ষা করে — পুরো আনপাবলিশড বডি পাবলিক | `app/api/case-studies/route.ts:18` | একই ফিক্স |
| M-6 | Revision version collision → nondeterministic restore। `(entity, entity_key, version)`-এ unique constraint নেই; `getRevision` `ORDER BY` ছাড়া `limit(1)` | `lib/revisions.ts:89`, `db/schema.ts` | unique constraint + 409-retry, বা `SELECT … FOR UPDATE` |
| M-7 | Unbounded list response: `GET /api/blog` full `content` (১০০ KB পর্যন্ত) × `MAX_LIMIT=100` ≈ ~১০ MB পাবলিক JSON | `app/api/blog/route.ts`, `lib/paginate.ts:35` | list endpoint-এ excerpt/summary কলাম project করো |
| M-8 | Dispatch drain-এ row claim নেই; concurrent run-এ double-send (cron + manual trigger overlap) | `app/api/cron/dispatch-drain/route.ts:84-106` | atomic claim (`UPDATE … SET status='Processing' … RETURNING`) বা advisory lock |
| M-9 | Retention cron anonymization অসম্পূর্ণ: `note`, `internalNotes`, `fbp`, `fbc` থেকে যায়; `lead_activities.note`, `dispatch_queue.payload`, `integration_logs` ছোঁয় না | `app/api/cron/retention/route.ts:137-147` | বাকি PII কলাম blank করো + related table sweep (consent record রেখে) |
| M-10 | `cron.yml` প্রতিটা tick-এ তিনটা রুটই ফায়ার করে (H-10-এর ডুপ্লিকেট কনফার্মেশন) | `.github/workflows/cron.yml` | schedule অনুযায়ী আলাদা job |
| M-11 | Raw driver error message ক্লায়েন্টে পৌঁছায় (`fail(errorMessage(error))`) — connection/host/constraint detail লিক | `app/api/admin/users/route.ts` প্রভৃতি | generic message + `requestId`; detail সার্ভারে রাখো |
| M-12 | Distributed rate limiting dead: KV নেই → `hitLimit` প্রোডাকশনে সবসময় `false`; login-এর DB-backed counter brute force-এ `admin_audit_logs` unbounded বাড়ায় | `lib/rateLimit.ts`, `wrangler.toml` | KV re-bind করো বা in-isolate backstop সব জায়গায়; WAF rule verify করো |
| M-13 | Turnstile সব misconfiguration-এ fail-open (`{ok:true, skipped:true}`) — bot protection নীরবে off থাকতে পারে | `lib/turnstile.ts:53-62,100-119` | sustained skip rate-এ alert করো |

### ৪.২ ডিপ্লয়মেন্ট/ইনফ্রা (৯টি)

| # | সমস্যা | লোকেশন | ফিক্স |
|---|---|---|---|
| M-14 | `deploy.yml` মাত্র ৯টা secret push করে; `LICENSE_PORTAL_API_BASE_URL`, `NOTIFY_FROM_EMAIL`, `NOTIFY_TO_EMAIL` কোড পড়ে কিন্তু push হয় না — ম্যানুয়াল dashboard setting-এর ওপর নির্ভরশীল | `.github/workflows/deploy.yml`, `lib/env.ts` | তিনটাকে push list-এ যোগ করো + RUNBOOK §13.4 |
| M-15 | `preview.yml` কোনো Worker secret push করে না; সব PR একটাই preview Worker/DB শেয়ার করে — concurrent PR একে অপরের deploy overwrite করে | `.github/workflows/preview.yml` | secret push করো; per-PR preview scope বা serialize করো |
| M-16 | Cron secret `?secret=` query param-এ accept করে — edge/WAF log-এ secret থেকে যায় | `app/api/cron/*/route.ts` | query path সরাও (workflow header ব্যবহার করে) |
| M-17 | Unbounded retention batch বনাম 120s cron timeout ও Worker limit; dispatch-drain প্রতি invocation-এ ~৪০+ subrequest (free plan-এ ৫০/request ceiling) | `app/api/cron/retention/route.ts`, `cron.yml` | `LIMIT`-based batching; Cloudflare plan RUNBOOK-এ রেকর্ড করো |
| M-18 | Domain sprawl + monitoring mismatch: prod `ecomate.bd`, কিন্তু RUNBOOK §16.1 monitor `ecomate.app`-এ, expected body `"status":"ok"` অথচ health রিটার্ন করে `"status":"healthy"`; `media.ecomate.app` resolve হয় না | `docs/RUNBOOK.md §16.1`, `wrangler.toml` | `ecomate.bd`-তে canonicalize করো; §16.1 URL+body ঠিক করো |
| M-19 | `DEPLOYMENT.md` stale — Cloudflare Pages/`/dist` বান্ডিলের বর্ণনা, বর্তমান Workers/opennext pipeline-এর সাথে মেলে না | `DEPLOYMENT.md` | Workers flow-এর জন্য rewrite করো; dashboard auto-deploy off আছে কিনা CI assertion যোগ করো |
| M-20 | RUNBOOK doc drift: "deploy কখনো end-to-end চলেনি", "migration blocked", triggers আছে বলা — সব outdated | `docs/RUNBOOK.md` | resolved item resolve হিসেবে মার্ক করো; review date দাও |
| M-21 | `db-migrate.mjs` concurrency-safe নয়; preview DB শেয়ারড — দুটো runner একই migration apply করলে journal `INSERT`-এ unique-violation → লাল deploy (DB ঠিক থাকলেও) | `scripts/db-migrate.mjs` | preview deploy globally serialize করো বা advisory lock নাও |
| M-22 | CI PR build প্রোডাকশন DB query করে (`DIRECT_URL` = prod secret PR build-এ expose) | `.github/workflows/ci.yml` | PR build-এ `PREVIEW_DIRECT_URL` ব্যবহার করো |

### ৪.৩ পাবলিক সাইট: SEO/পারফরম্যান্স (৬টি)

| # | সমস্যা | লোকেশন | ফিক্স |
|---|---|---|---|
| M-23 | `/bn` home `og:locale: 'en_US'` inherit করে | `app/[locale]/layout.tsx:48` | per-locale `openGraph.locale` (`bn_BD`/`en_US`) |
| M-24 | Dead CDN host (`media.ecomate.app` resolve হয় না) `og:image` ও hero image poison করে | `lib/seo.ts:216` | dead host same-origin `/media/<key>` proxy path-এ rewrite করো |
| M-25 | পুরো মার্কেটিং পেজ একটা client component — Header/Hero/Footer সহ ১৫ সেকশন client JS-এ, server-streamed RSC markup নেই | `src/components/LandingShell.tsx:1` | static section server component-এ রেন্ডার করো |
| M-26 | ~১০০ KB static bilingual copy client bundle-এ (`landingContent.ts` 100,129 bytes) | `components/shell/LocaleThemeProvider.tsx:30` | per-locale split + dynamic `import()` |
| M-27 | Dead heavy dependency: `@aws-sdk/client-s3`, `@google/genai` কোথাও import নেই; `dotenv` শুধু e2e-তে, তবু `dependencies`-এ | `package.json` | দুটো সরাও; `dotenv` → `devDependencies` |
| M-28 | Meta Pixel `PageView` শুধু first mount-এ fire হয়; client-side navigation-এ re-fire হয় না | `components/MetaPixel.tsx:44-57` | route-change-এ `fbq('track','PageView')` (consent gate-এর ভেতর) |

### ৪.৪ পাবলিক সাইট: i18n/লোকেল সিস্টেম (১৭টি — সবচেয়ে বড় ক্লাস্টার)

`/bn` এক্সপেরিয়েন্স বর্তমানে **অর্ধেক-লোকালাইজড** — hreflang/SEO ইনভেস্টমেন্টের বিপরীতে বিশাল hardcoded English ব্লক:

| # | সমস্যা | লোকেশন |
|---|---|---|
| M-29 | Locale toggle URL বদলায় না, chrome পুরনো ভাষায় থাকে, choice persist হয় না, title/meta আপডেট হয় না | `LocaleThemeProvider.tsx:174` |
| M-30 | Client locale navigation-এ আগের locale-এর content flash হয় | `LocaleThemeProvider.tsx:150-154` |
| M-31 | Theme preference persist হয় না — reload-এ ভুলে যায় | `LocaleThemeProvider.tsx:136` |
| M-32 | Hero console deck সম্পূর্ণ ইংরেজি (sales/fulfillment/packing/courier/POS প্যানেল) | `Hero.tsx:157-660` |
| M-33 | Comparison diagram ইংরেজি ("Unlinked Excel Sheet ✗", "HIGH FRICTION") | `ComplexitySection.tsx:58-78,100-121` |
| M-34 | "Decomposed Revenue Attribution" ব্লক, channel row, "Courier Performance Matrix" ইংরেজি | `ExecutiveAnalyticsSection.tsx:49-114` |
| M-35 | Scenario card, ROI calculator label, slider scale Western digit-এ | `LossPreventionSection.tsx:34-71,203-207,221-246` |
| M-36 | DATA STAGE card, "Server Connected"/EMQ badge, attribution callout ইংরেজি | `MarketingSection.tsx:38-71,75-85,94-104` |
| M-37 | Allocation panel, channel-card footer ("Under Active Roadmap"…) ইংরেজি | `MultiChannelSection.tsx:24-76,95-103` |
| M-38 | POS step card, telemetry heading, commission paragraph ইংরেজি | `PosShowroomSection.tsx:45-83,89-104` |
| M-39 | "Role #N", "Responsibilities", "Enforced Boundary", HR/payroll card ইংরেজি | `TeamOperationsSection.tsx:35-90` |
| M-40 | "Featured Merchant Story", "Illustrative Metrics (Demo Data)", "Watch Founder Interview" ইংরেজি | `CustomerProofSection.tsx:44,68-79,99,142,172` |
| M-41 | "-20%" badge, "/ month", "Included Capabilities", lead-form "WhatsApp Live Chat", "Sun-Thu 9am-8pm" ইংরেজি | `PricingSection.tsx:56,98,117-122,144-150`, `FinalConversionSection.tsx:178-236` |
| M-42 | `volumeOptions[1] || '150-500 orders / day'` — `/bn`-তে English fallback; 0–1 option-এ stale value post হয় | `FinalConversionSection.tsx:45,266` |
| M-43 | "Call Sales" tel-CTA label ইংরেজি | `FaqSection.tsx:98` |
| M-44 | Footer Capabilities কলাম, "Privacy Policy"/"Terms of Service" label, `DEFAULT_PLATFORM_LINKS` English fallback ইংরেজি | `Footer.tsx:11-19,62-80,123-126` |
| M-45 | DB menu খালি-কিন্তু-present (`[]`) হলে header/footer-এর সব navigation মুছে যায় (nullish নয় বলে fallback কাজ করে না) | `Header.tsx:19`, `Footer.tsx:19` |

**ফিক্স দিকনির্দেশনা (M-29–M-45):** string-গুলো `LandingContent`-এ per-locale সরাও (established pattern); numeral `Intl`-based helper-এ (`lib/format.ts` যেখানে ব্যবহৃত, সঠিক); toggle-এ `/{locale}`-তে client router push করো।

### ৪.৫ পাবলিক সাইট: নেভিগেশন/অ্যাক্সেসিবিলিটি (২টি)

| # | সমস্যা | লোকেশন | ফিক্স |
|---|---|---|---|
| M-46 | Dead `#tour` anchor (কোনো `id="tour"` নেই) ও dead `href="#"` legal লিঙ্ক ("Security & RBAC", "System Status") | `landingContent.ts:11,715`, `Footer.tsx:64,74,125,126` | real section id বা real route দাও, নইলে সরাও |
| M-47 | Video modal keyboard trap: `role="dialog"` কিন্তু accessible name নেই, Escape/backdrop close নেই, focus trap/return নেই, body scroll lock নেই | `CaseStudyVideoModal.tsx:18-22` | `aria-labelledby`, Escape + backdrop dismissal, focus trap/return, `overflow:hidden` |

---
## ৫. 🔵 Low ফাইন্ডিংস (৬৬টি — সংক্ষিপ্ত তালিকা)

### ৫.১ সিকিউরিটি/ডেটা Low (২৫টি)

| # | সমস্যা | লোকেশন |
|---|---|---|
| L-1 | Cron secret `?secret=` query param-এ নেওয়া হয় — edge log-এ secret | `app/api/cron/*/route.ts` |
| L-2 | `GET /api/ready` unauthenticated/unthrottled, প্রতি কলে DB+R2+KV probe, error detail echo করে | `app/api/ready/route.ts` |
| L-3 | পাবলিক pricing GET inactive plan লিক করে (`isActive` ফিল্টার নেই) | `app/api/pricing/route.ts:10` |
| L-4 | পাবলিক media-library GET-এ কোনো auth নেই — পুরো internal asset inventory + R2 key exposed | `app/api/media/route.ts:17` |
| L-5 | Social-links GET hidden (`isVisible=false`) লিঙ্কও দেয় `?visible=true` ছাড়াই | `app/api/social-links/route.ts:22` |
| L-6 | `SAFE_URL` regex protocol-relative `//evil.com` allow করে (empirically verified) — blog `href`/`src`-এ attacker host সম্ভব | `lib/sanitize.ts:40` |
| L-7 | `z.url()` `javascript:`/`data:` scheme accept করে (installed zod-এ verified) — `featuredImageUrl`, `videoUrl` ইত্যাদিতে stored-XSS ভেক্টর (admin-write-only) | `lib/validation/*` |
| L-8 | `PUT /api/menus` wholesale replace করে, `parentId` নেই — nested child item প্রতি save-এ নীরবে ধ্বংস হয় | `app/api/menus/route.ts:163` |
| L-9 | Settings PUT শুধু এক locale invalidate করে; `id = 1` হার্ডকোড (reseed-এ ভাঙবে) | `app/api/settings/route.ts:28,32` |
| L-10 | Blog PUT/restore `deletedAt` উপেক্ষা করে — soft-deleted post edit করা যায়; restore still-deleted row-তে লেখে | `app/api/blog/[idOrSlug]/route.ts:66,137` |
| L-11 | `assertMediaNotInUse` `%${key}%` LIKE-এ `%`/`_`/`\` escape করে না — wildcard key-তে false positive/negative | `lib/guard.ts:86` |
| L-12 | Publish latest draft transaction-এর বাইরে পড়ে — mid-flight staged draft নীরবে supersede হয় | `app/api/content/[sectionKey]/publish/route.ts:57` |
| L-13 | Restore draft revision-কেও `status:'published'` করে; resurrect-এ `version: 1` হার্ডকোড | `restore/route.ts:76` |
| L-14 | `ogImageUrl` validate হয় কিন্তু discard হয় (কোনো কলাম নেই) — schema/handler mismatch | `app/api/blog/route.ts:48` |
| L-15 | Missing index: `pricing_plans(sort_order)`, `social_links(sort_order)` (repo convention অনুযায়ী বাকিদের আছে) | `db/schema.ts` |
| L-16 | Dead code: `lib/blog.ts`, `lib/pricing.ts` helper unreferenced; testimonial/caseStudy create schema-র কোনো consuming route নেই (CRUD অর্ধেক-বানানো) | `lib/*` |
| L-17 | `landing_content.deletedAt` dead lifecycle — কোনো রুট set করে না; PUT/publish `deletedAt: null` লেখে (resurrect) | বিভিন্ন |
| L-18 | `POST /api/admin/setup/totp` reissue session revoke করে না (peer reset করে) — inconsistent | `app/api/admin/setup/totp` |
| L-19 | `assertNotLastSuperadmin` transaction-এর বাইরে — concurrent demotion-এ শেষ superadmin হারানো সম্ভব (TOCTOU) | `users/[id]/route.ts` |
| L-20 | Misleading comment: `trustHost` "allowlist" দাবি করলেও boolean `trustHost: true` kill-switch; আসল protection Cloudflare routing | `auth.ts` |
| L-21 | `GET /api/admin/setup` `setupEnabled`/`alreadyCompleted` লিক করে — minor recon | `app/api/admin/setup` |
| L-22 | Dead `@google/genai` + `GEMINI_API_KEY` drift; `lib/env.ts` key union-এ `R2_PUBLIC_ORIGIN`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `SENTRY_DSN` নেই; `.env.example`-এ `NOTIFY_*` নেই — env doc drift দুদিকেই | `lib/env.ts`, `.env.example` |
| L-23 | `jwt` callback session cookie-সহ **প্রতিটা request**-এ 3-table join — caching নেই (এই scale-এ ঠিক, নজরে রাখো) | `auth.ts` |
| L-24 | `POST /api/leads`-এ `req.json()`-এর আগে body size cap নেই; lead form-এ honeypot নেই | `app/api/leads/route.ts` |
| L-25 | `clientIp` `x-real-ip`/`x-forwarded-for`-এ fallback, validation ছাড়া — Cloudflare-এ ঠিক (`cf-connecting-ip` authoritative), অন্যত্র spoofable | `lib/request.ts` |

### ৫.২ ইনফ্রা/পাইপলাইন Low (৯টি)

| # | সমস্যা | লোকেশন |
|---|---|---|
| L-26 | `cron.yml` লগে `POST $route` লেখে কিন্তু curl `GET` করে (cosmetic) | `.github/workflows/cron.yml` |
| L-27 | `compatibility_date = "2026-06-01"` ~৪ মাস stale; top-level `wrangler.toml`-এ `PASTE_HYPERDRIVE_ID_FROM_STEP_1` (implicit guard) | `wrangler.toml` |
| L-28 | `[env.preview]`-এ `[observability]` block নেই (production-এ আছে) | `wrangler.toml` |
| L-29 | Dead config: `GEMINI_API_KEY`, `SENTRY_DSN` declare কিন্তু unread | `cloudflare-env.d.ts`, `.env.example` |
| L-30 | `open-next.config.ts` minimal (no cache backend) — deliberate caching-off decision, ঠিক আছে | `open-next.config.ts` |
| L-31 | Turnstile fail-open by design; production `NEXT_PUBLIC_TURNSTILE_SITE_KEY = ""` — bot protection off যতক্ষণ operator set না করে | `lib/turnstile.ts`, `.env.example` |
| L-32 | R2 "ensure bucket" bucket বানায় কিন্তু `media.ecomate.app` custom domain attach করে না — recreated bucket নীরবে media URL ভাঙে | `deploy.yml`, `preview.yml` |
| L-33 | Build-artifact handoff: `upload-artifact` retention ২ দিন; deploy job দেরি হলে fail | `deploy.yml` |
| L-34 | `wrangler.e2e.json`-এ caching-era binding (`NEXT_INC_CACHE_R2_BUCKET`, `DOShardedTagCache`) এখনো আছে — e2e-তে harmless, stale | `wrangler.e2e.json` |

### ৫.৩ ফ্রন্টএন্ড Low (৩২টি)

| # | সমস্যা | লোকেশন |
|---|---|---|
| L-35 | `og:locale` bare `'en'`/`'bn'` — spec চায় `en_US`/`bn_BD` | blog/case-study/privacy/terms page |
| L-36 | `og:url` `https://ecomate.bd` বনাম canonical `https://ecomate.bd/` — byte-identical করো | `app/layout.tsx:60` |
| L-37 | `robots.ts` `host` directive Yandex-only; সরাও | `app/robots.ts:14` |
| L-38 | sitemap comment বনাম code mismatch (`created_at` vs `lastModified`) | `app/sitemap.ts:33-35,80` |
| L-39 | Stale comment: root layout "CMS-editable seo_title" দাবি করে, আসলে hardcoded title | `app/[locale]/layout.tsx:27-29` |
| L-40 | `twitter.card: 'summary_large_image'` কিন্তু site-wide image নেই; `public/`-এ default OG asset নেই | `app/layout.tsx:71` |
| L-41 | `homeHref` " `/` is English" হার্ডকোড করে, `DEFAULT_LOCALE` env-driven — flip করলে misroute | blog/case-study/privacy/terms page |
| L-42 | Hook-এ `'use client'` নেই, `LandingShell` boundary-এর ওপর নির্ভরশীল (fragile) | `Hero.tsx`, `Header.tsx`, `MobileStickyBar.tsx` |
| L-43 | Icon-button `aria-label`/`title` দুই locale-তেই hardcoded English | `Header.tsx:73,104-105,118-119` |
| L-44 | `` `tel:${phone}` `` literal space তৈরি করে (`tel:+880 1894-828290`) — কিছু dialer misparse করে | `Footer.tsx:99` |
| L-45 | SVG gradient id duplicated (Header + Footer logo) | `EcoMateLogo.tsx:55,61` |
| L-46 | Metrics tab `role="region" tabIndex={0}` — অর্থহীন tab stop; tablist pattern ব্যবহার করো | `Hero.tsx:220` |
| L-47 | Play circle plain `div` (unfocusable); "Print Label & Seal Parcel" button-এ `onClick` নেই | `CaseStudyVideoModal.tsx:34`, `Hero.tsx:527-531` |
| L-48 | Mobile menu focus move/body-scroll-lock/focus-return নেই | `Header.tsx:168-196` |
| L-49 | `/bn`-তে hardcoded Latin digit ("4-6%", "0.05%") | `ComplexitySection.tsx:81,125` |
| L-50 | ১৩/১৪ section ফাইলে unused lucide-react import (lint noise) | বিভিন্ন section |
| L-51 | FAQ accordion panel-এ `id`/`role="region"` নেই, button-এ `aria-controls` নেই | `FaqSection.tsx:38-42,60-67` |
| L-52 | Interactive selector button-এ শুধু visual active state; `aria-pressed`/`aria-current` নেই | `EcosystemSection.tsx`, `ComplexitySection.tsx`, `FulfillmentPipelineSection.tsx` |
| L-53 | "Step X of 07" total হার্ডকোডেড | `FulfillmentPipelineSection.tsx:152` |
| L-54 | `animate-in fade-in` class no-op (`tailwindcss-animate` installed নেই) | `FaqSection.tsx:63`, `FinalConversionSection.tsx:248` |
| L-55 | `scrollbar-none` utility undefined — mobile stepper-এ native scrollbar | `FulfillmentPipelineSection.tsx:104` |
| L-56 | Heading skip: `h2`-এর নিচে সরাসরি `h4`; Hero deck-এ `h1`→`h4` jump | `FaqSection.tsx:75`, `Hero.tsx:326,381,543,575,611,639` |
| L-57 | Decorative quote glyph-এ `aria-hidden="true"` নেই | `CustomerProofSection.tsx:56` |
| L-58 | MODE 1-এ খালি `plans` header+toggle রেন্ডার করে, card ছাড়া | `PricingSection.tsx:60-63` |
| L-59 | Turnstile `api.reset()` try/catch ছাড়া — captcha-internal failure generic form error হয় | `Turnstile.tsx:125` |
| L-60 | Concurrent `getToken()` resolver ref overwrite করে | `Turnstile.tsx:105-110` |
| L-61 | `scrollIntoView({behavior:'auto'})` `scroll-smooth` class-এর নিচে smooth-এ resolve হয় | `LocaleThemeProvider.tsx:110` |
| L-62 | Consent banner dismiss-এ focus `<body>`-তে পড়ে; আগের element-এ restore হয় না | `ConsentBanner.tsx:35-40` |
| L-63 | Consent banner root layout-এ `/admin/*`-তেও render হয় | `ConsentBanner.tsx:22` |
| L-64 | `body { overflow-x: hidden }` scroll container বানায় — `position: sticky` ভাঙতে পারে; `overflow-x: clip` ব্যবহার করো | `app/globals.css:23` |
| L-65 | `scroll-smooth`/color transition-এ `prefers-reduced-motion` fallback নেই | `app/globals.css:26`, `app/layout.tsx:91` |
| L-66 | `images.remotePatterns`-এ `media.ecomate.app` (resolve হয় না) — live হওয়ার আগে সরাও | `next.config.ts:40` |

---
## ৬. ✅ যাচাই করে সুস্থ পাওয়া অংশ (ফাইন্ডিং নয়)

অডিটে যেগুলো **ভালো** পাওয়া গেছে, রেকর্ড হিসেবে রাখা হলো:

- **অথ কোর:** session registry + live role re-read; role change/password reset/deactivate-এ revocation; last-superadmin ও self-deactivate guard; API response-এ `password_hash` নেই; TOTP at rest encrypted (AES-GCM), ±1-step window, superadmin enrolment বাধ্যতামূলক; proxy redirect-before-auth ordering সঠিক; admin-এ `Cache-Control: no-store`; সব proxied response-এ security header।
- **ডেটা:** কোথাও mass assignment নেই (explicit field mapping + `z.strictObject`); multi-table write-এ transaction; migration drift নেই (সব table/index present); HTML write **ও** render দুই জায়গায় sanitize; media magic-byte validation; CSV formula-injection guard; lead export audited + 10k-capped; Meta CAPI PII SHA-256 hashed; Resend recipient env-fixed + idempotency key; seed-এ credential নেই; কোনো secret committed নেই (gitleaks)।
- **Workers compatibility:** app/lib কোডে `node:` import নেই; WebCrypto ব্যবহার; `nodejs_compat` flag set; Hyperdrive optional chaining (`env.HYPERDRIVE?.connectionString`) — unbound-binding crash path নেই।
- **Migration মডেল:** journaled SQL only, `db:push` banned + CI guard, drift guard, verbose custom runner।
- **পাবলিক সাইট:** সব page/layout-এ `params` awaited; `generateStaticParams` দুই locale কভার করে; sitemap URL সব resolve হয়; hreflang reciprocal; JSON-LD `<` escaping; ঠিক একটা `h1`; marketing component-এ raw `<img>` নেই; `target="_blank"`-এ `rel="noreferrer"`; কোডে TODO/FIXME/lorem নেই।

### আমার নিজের যাচাই (৮ অক্টোবর, লোকাল ক্লোনে)
- `npx tsc --noEmit` → **০ এরর** (২০০ ফাইল চেক হয়েছে — tsconfig exclude trick নয়)
- `npm audit` → **০ vulnerability**

---

## ৭. 🛠 ফিক্স রোডম্যাপ (প্রায়োরিটি ক্রমে — সিদ্ধান্ত-পরবর্তী সংস্করণ)

### Phase 1 — আজই (সিকিউরিটি, ঘণ্টার কাজ)
1. **CR-1:** `/api/integrations/logs`-এ `requireAdminRole` — এক লাইনের গার্ড, PII breach বন্ধ।
2. **CR-2:** timing-equalizer hash 100k-এ regenerate + `verifyPassword`-এ catch।
3. **CR-3/সিদ্ধান্ত ৬:** preview environment decommission — `preview.yml` মুছো → `deploy.yml` থেকে preview choice সরাও → `[env.preview]` সরাও (প্রতিটা ধাপে prod deploy verify করে)।
4. **H-4–H-9/সিদ্ধান্ত ১:** per-resource RBAC — editor-দের blog/case-study/testimonial/media CRUD দাও; pricing/settings/sections/social-links/users/integrations admin-only রাখো (blanket guard নয়)।
5. **CR-4/5/6:** তিনটা empty-array guard — এক লাইন করে, পুরো সাইট ডাউনের ঝুঁকি শেষ।

### Phase 2 — এই সপ্তাহে (ডেটা লিক, পাইপলাইন, কনফার্মড ফিচার-গ্যাপ)
6. **M-1–M-5 + সিদ্ধান্ত ১০:** ৫টা পাবলিক GET-এ `status='published'` ফিল্টার + admin-gated draft preview mechanism।
7. **H-2/H-3:** sync route admin-only + idempotency key + `rawResponse` echo বন্ধ।
8. **H-1/সিদ্ধান্ত ১৪:** Meta CAPI two-mode — `trackingConsent` persist + admin settings (`meta_capi_mode`, `meta_validated_status`, `meta_instant_event_name`) + Lead event field allowlist।
9. **H-19/H-20 (নতুন):** testimonial multi-format CRUD (video short/standard, image, text+image) + case-study write endpoints।
10. **H-10/M-10:** `cron.yml` schedule আলাদা করো; retention-এ `LIMIT` batching।
11. **H-11:** `ci.yml`-এ `vitest run --coverage` যোগ করো।
12. **H-12/সিদ্ধান্ত ৮:** `/health` সস্তা public + `/ready` throttled public; post-deploy `/api/ready` poll + `wrangler rollback` drill।
13. **M-8:** dispatch drain-এ atomic row claim।
14. **সিদ্ধান্ত ৫:** dead dependency সরাও (`@google/genai`, `@aws-sdk/client-s3`; `dotenv` → devDeps)।
15. **সিদ্ধান্ত ৭:** ৩টা secret deploy.yml push list-এ যোগ করো + ডকুমেন্ট করো।

### Phase 3 — এই মাসে (পারফরম্যান্স, হার্ডেনিং, কোয়ালিটি)
16. **সিদ্ধান্ত ৪ (High):** smart caching আর্কিটেকচার — ISR + on-demand revalidation, server components, per-locale splitting (M-25/M-26/L-30)।
17. **সিদ্ধান্ত ৯ (High):** presigned-URL media flow + media library UI (editor-দের জন্য)।
18. **সিদ্ধান্ত ২:** DB-backed rate limiting (Postgres sliding window) + in-memory backstop + Turnstile।
19. **সিদ্ধান্ত ৩:** Turnstile hybrid fail policy।
20. **সিদ্ধান্ত ১২:** Sentry implement করো।
21. **সিদ্ধান্ত ১৩:** `ecomate.app` রেফারেন্স সরাও; `media.ecomate.bd` workflow-bind করো (M-18/L-32)।
22. **H-15–H-18:** SSR `lang`, header `querySelector` guard, consent banner লিঙ্ক + বাংলা কপি, locale toggle → `/{locale}` navigate (সিদ্ধান্ত ১৫), `#tour` সরাও (সিদ্ধান্ত ১৬)।
23. **Permalink (নতুন):** slug-only public URL + ID→slug 301 redirect।
24. **M-23/M-24/M-28:** OG locale/image, Pixel PageView।
25. **M-29–M-45:** i18n ক্লাস্টার — string `LandingContent`-এ সরানো (section-by-section)।
26. **M-19/M-20:** DEPLOYMENT.md rewrite + RUNBOOK drift cleanup।
27. **M-9:** retention anonymization সম্পূর্ণ করো।
28. Low আইটেমগুলো lint/a11y পাসে ধীরে ধীরে।

---

## ৮. 🧭 রেন্ডারিং স্ট্র্যাটেজি গাইড (Next.js 16 Cache Components + Cloudflare Workers)

> **প্রেক্ষাপট:** মালিকের সিদ্ধান্ত (§১.৫-৪) — "dynamic" মানে admin থেকে configurable, caching বাদ নয়; সর্বোচ্চ smart caching + সর্বোচ্চ speed বাধ্যতামূলক। সুখবর: এই কোডবেসে **2026-10-06-এ Task 22 দিয়ে একটি পূর্ণাঙ্গ caching ডিজাইন verify করা ছিল** — 10-07-এ শুধু cache backend (R2 + Durable Object) না থাকায় তা বন্ধ করা হয়। `docs/CACHE.md`-এ পুরো ডিজাইন (tag table, profile, failure path, build note) verbatim সংরক্ষিত আছে। নিচের স্ট্র্যাটেজি সেই verified ডিজাইনের **restoration + সম্প্রসারণ** — নতুন করে আবিষ্কার নয়।

### ৮.১ মূলনীতি (তিন লাইনে)

1. **Public content → Static / Partial-Prerender + admin publish-এ on-demand invalidation।** কনটেন্ট "dynamic" কারণ অ্যাডমিন বদলাতে পারে — প্রতিটা request-এ DB hit করার কারণে নয়।
2. **Admin / API mutation / auth → সবসময় dynamic, কোনো cache নয়।**
3. **Interactivity → ছোট client islands।** Page বা section wrapper-এ কখনো `'use client'` নয়।

### ৮.২ রুট-বাই-রুট ম্যাট্রিক্স (কোথায় কোন মোড)

| এরিয়া | রুট | মোড | কীভাবে | Invalidation |
|---|---|---|---|---|
| Landing home | `/`, `/[locale]` (১৫ সেকশন) | ○ Static | `'use cache'` in `getLandingContent(locale)` | tag `content:{locale}` → admin section publish-এ `updateTag` |
| Blog index | `/[locale]/blog` | ○ Static | `getPublishedBlogPosts()` | tag `blog` |
| Blog post | `/[locale]/blog/[slug]` | ○ Static (enumerated) + ◐ PPR (নতুন slug) | tags `blog` + `blog:{slug}` | long profile `3600/86400/604800` |
| Case studies | `/[locale]/case-studies`, `/[slug]` | ○ + ◐ (blog-এর মতো) | tags `casestudies`, `casestudies:{slug}` | H-20-এর write endpoint-এ invalidation যোগ করতে হবে (বর্তমানে "no writer" gap) |
| Testimonials section | landing-এর ভেতর | ○ Static | `getTestimonials()` | H-19-এর write endpoint-এ invalidation যোগ করতে হবে |
| Legal | `/[locale]/privacy`, `/terms` | ○ Static | tag `content:{locale}` | settings/section write |
| Pricing | landing-এর ভেতর | ○ Static | `getPricingPlans()` (plans + visibility toggle একসাথে, drift রোধে) | tag `pricing` |
| Menus/Header/Footer | সব পেজের chrome | ○ Static | `getMenu(key, locale)` | tags `menus:main:{locale}`, `menus:footer:{locale}` |
| Sitemap/Robots | `/sitemap.xml`, `/robots.txt` | ○ Static + periodic revalidate | — | `blog`/`casestudies`/`content` tag |
| Lead form | landing-এর ভেতর | **Client island** (static page-এর ভেতর) | `FinalConversionSection` form → `POST /api/leads` (dynamic) | N/A (mutation) |
| Public API GET | `/api/blog`, `/api/content/*`… | Dynamic handler, **ভেতরের read cached** | `lib/content.ts` reader-ই cache boundary | tag-ভিত্তিক (API নিজে cache করে না) |
| Admin API | `/api/admin/*`, `/api/auth/*` | ƒ Dynamic + auth, no-store | — | N/A |
| Cron | `/api/cron/*` | ƒ Dynamic + `CRON_SECRET` | — | N/A |
| Health | `/api/health` | Public, সস্তা 200 (probe নয়) | — | N/A |
| Ready | `/api/ready` | Public, probe-সহ কিন্তু throttled | — | N/A |
| Media delivery | `/media/[...key]` | Dynamic handler, **immutable cache header** | R2 object + content hash | object replace = নতুন key |
| Admin UI | `/admin/*` | ƒ `force-dynamic`, `no-store`, auth-gated | — | N/A |
| Login/Setup | `/admin/login` | Static shell + client form | কোনো sensitive data prerender নয় | N/A |

**মোড চিহ্ন:** ○ = Static (build/cache), ◐ = Partial Prerender (static shell + dynamic island), ƒ = per-request dynamic। Task 22-এর verified build output-এ `/`, `/en`, `/bn`, privacy/terms ছিল ○ Static, `[slug]` ছিল ○/◐, admin/API ছিল ƒ — **এটাই লক্ষ্য state**।

### ৮.৩ Server vs Client Component — কঠোর নিয়ম

1. **Default = Server Component।** `'use client'` শুধু তখনই, যখন `useState`/`useEffect`/event handler/browser API (`window`, `localStorage`) সত্যিই দরকার।
2. **Data fetching শুধু server-এ।** Initial content-এর জন্য client-side fetch নিষেধ — island-কে serializable props হিসেবে ডেটা পাস করো।
3. **Island = একটা widget** (calculator, tab, modal, accordion, form, video player)। পুরো page বা section wrapper-এ `'use client'` নিষেধ — এটাই M-25-এর fix (বর্তমানে `LandingShell` পুরোটা client)।
4. **Provider split করো:** `params` থেকে locale server-এ পড়ে prop হিসেবে দাও; client provider (theme/toggle) যত ছোট সম্ভব রাখো — ১০০ KB `landingContent.ts` client bundle-এ ঢোকা (M-26) এই নিয়ম ভাঙার ফল।
5. **`generateMetadata` / `generateStaticParams` সবসময় server-এ** — SEO content কখনো client-এ নয়।
6. **Third-party script:** `next/script` + `lazyOnload` + consent gate (Meta Pixel ইতিমধ্যে ঠিক আছে); Turnstile শুধু form submit-এ load করো (বর্তমান behavior রাখো)।
7. **PPR pattern:** static shell + `<Suspense>`-এ dynamic island (যেমন logged-in admin-এর জন্য personalized অংশ) — "◐ Partial Prerender"।

### ৮.৪ Static vs SSR vs PPR — সিদ্ধান্ত নিয়ম (decision tree)

- **Public + SEO দরকার + admin বদলাতে পারে → Static + on-demand invalidation** (default choice — উপরের ম্যাট্রিক্স)
- **Public + per-request ভিন্ন হয়** (cookie/session অনুযায়ী) **→ PPR**: static shell + Suspense-এ dynamic island; PPR সম্ভব না হলে `force-dynamic`
- **Admin / logged-in user → `force-dynamic`, `no-store`** (কোনো cache নয় — stale admin data ভয়ংকর)
- **Mutation / auth / cron → dynamic route handler**
- **নিষেধ:**
  - Public marketing page-এ `force-dynamic` (বর্তমান "সব dynamic" অবস্থা — এটাই বদলাতে হবে)
  - SEO content-এর জন্য client-side fetch
  - Build-time-এ secret/binding-dependent prerender — Hyperdrive build-এ bind হয় না; CI-তে build step-এ `DIRECT_URL` দিতে হবে (`docs/CACHE.md` build note)
  - `proxy.ts` (middleware)-কে ভারী করা — এটা প্রতিটা request-এ চলে; redirect-before-auth ordering বজায় রাখো

### ৮.৫ Invalidation ডিজাইন (ডিজাইন করা আছে — restore করতে হবে)

- **Single caching boundary: `lib/content.ts`** — সব cached read এখানে, প্রতিটার explicit `cacheTag` + `cacheLife`।
- **Single invalidation boundary: `lib/revalidate.ts`** — `invalidateDomains()` / `invalidateMenus()`; route handler-এ direct `updateTag` নিষেধ (একজন writer নীতি)।
- **Tag table = `docs/CACHE.md`-এর table** (single source of truth): `content:{locale}`, `menus:main:{locale}` / `menus:footer:{locale}`, `blog`, `blog:{slug}`, `pricing`, `social`, `testimonials`, `casestudies`, `casestudies:{slug}`।
- **⚠️ Gap (H-19/H-20):** `testimonials`/`casestudies`-এর "no writer" — write endpoint বানানোর সময় invalidation যোগ করা বাধ্যতামূলক।
- **`updateTag`** = synchronous, same-request (admin mutation — admin নিজের edit পরের navigation-এ দেখবে)। **`revalidateTag({expire: 0})`** = background, শুধু cron publish-এ।
- **Failure path:** `stale: 30` load-bearing — `0` করলে DB outage-এ **build fail** হয় (`docs/CACHE.md`-এ প্রমাণিত)। বদলাবে না।
- **নতুন cached read যোগের নিয়ম** (CACHE.md থেকে): ① function → `lib/content.ts` (`cacheTag`+`cacheLife` সহ) ② tag → table-এ register ③ invalidation → `lib/revalidate.ts` দিয়ে admin mutation-এ ④ নইলে write commit হবে কিন্তু page পুরনো value serve করবে।

### ৮.৬ Cloudflare Workers-এ বাস্তবায়ন (concrete re-enable plan)

`docs/CACHE.md`-এর "Re-enable path" অনুযায়ী, ক্রমানুসারে:

1. **R2 bucket provision** (prod): যেমন `ecomate-inc-cache` → `wrangler.toml` `[env.production]`-এ binding `NEXT_INC_CACHE_R2_BUCKET`।
2. **DO tag cache:** `DOShardedTagCache` class + binding `NEXT_TAG_CACHE_DO_SHARDED` + migration entry — `wrangler.e2e.json`-এ working template আছে (লাইন 14–21)।
3. **`open-next.config.ts`-এ cache override ফেরাও** (বর্তমানে `defineCloudflareConfig({})` — খালি)।
4. **`next.config.ts`:** `cacheComponents: true` (+ `partialPrefetching: true` — `instant-nav.rig.md`-এর সাথে consistent)।
5. **`lib/content.ts`-এ `'use cache'` directives ফেরাও; `lib/revalidate.ts`-এর no-op body restore করো** (signature ইতিমধ্যে আছে)।
6. **CI:** build step-এ `DIRECT_URL` expose করো (build-time prerender-এ Hyperdrive থাকে না)।
7. **আগে preview-এ prove করো, তারপর prod** — CACHE.md-এর সতর্কতা (Dummy-cache 500-এর পুনরাবৃত্তি নয়)।
8. **E2E test:** admin-এ publish → public page আপডেট হয় (on-demand invalidation-এর প্রমাণ)।
9. **লক্ষ্য build output** (Task 22 verified): `/`, `/en`, `/bn`, privacy/terms = ○ Static `(1h/1d)`; `[slug]` = ○ Static `(1d/7d)`; admin/API = ƒ।

### ৮.৭ Anti-pattern → Fix (এই কোডবেসে পাওয়া)

| Anti-pattern | কোথায় | Fix |
|---|---|---|
| পুরো page `'use client'` | `LandingShell.tsx` (M-25) | section → server; widget → client islands with props |
| ১০০ KB copy client bundle-এ | `LocaleThemeProvider.tsx` (M-26) | per-locale server import + dynamic `import()` |
| SEO content client-fetch | — (নিয়ম হিসেবে) | server props |
| Public page `force-dynamic` | বর্তমান global অবস্থা | §৮.২ matrix |
| Cache backend ছাড়া `cacheComponents` | Oct-07 incident | §৮.৬-এর R2+DO আগে, directive পরে |

### ৮.৮ মেইনটেন্যান্স — স্ট্র্যাটেজি কীভাবে ধরে রাখবে

1. **নতুন page/route checklist:** §৮.২ matrix থেকে mode বাছো → code-এ set করো → CMS-driven হলে tag table-এ entry + `lib/revalidate.ts`-এ invalidation।
2. **`docs/CACHE.md` = living doc** — tag table-এর single source of truth; RUNBOOK-এর মতো review date দাও।
3. **CI guard:**
   - `lighthouserc.json` performance budget enforce করো — regression-এ PR block (ফাইল আছে, gate বসাও)।
   - grep guard: `app/[locale]/**/page.tsx`-এ `'use client'` নিষেধ (allowlist ছাড়া)।
4. **Code review checklist item:** প্রতিটা admin mutation-এ matching invalidation আছে কিনা।
5. **Quarterly review:** Workers analytics থেকে cache hit ratio দেখে `cacheLife` profile tuning।

---

## ৯. দাবিত্যাগ ও সীমাবদ্ধতা

- এটি **static read-only audit** — কোড পড়ে করা; production runtime behavior, লোড টেস্ট, বা pentest করা হয়নি।
- কিছু ফাইন্ডিং (যেমন WAF rule-এর অনুপস্থিতি) repo-র বাইরের dashboard state-এর ওপর নির্ভরশীল — Cloudflare dashboard-এ verify করা দরকার।
- Severity আমার professional judgment; ব্যবসায়িক প্রেক্ষাপটে তুমি reprioritize করতে পারো।
- অডিট চলাকালীন রিপোতে কোনো পরিবর্তন করা হয়নি; এই রিপোর্ট `~/workspace/your_files/`-এ সংরক্ষিত।

---

*রিপোর্ট শেষ। প্রশ্ন থাকলে বা কোনো ফাইন্ডিংয়ের গভীরে যেতে চাইলে বলো।*
