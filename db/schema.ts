import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  jsonb,
  check,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Site Settings Table (Global config, branding, locale defaults, SEO)
export const siteSettingsTable = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  siteName: text('site_name').notNull().default('EcoMate'),
  tagline: text('tagline').notNull().default('Your Entire E-commerce Operation, Managed From One Place'),
  logoUrl: text('logo_url').default(''),
  faviconUrl: text('favicon_url').default(''),
  defaultLocale: text('default_locale').notNull().default('en'),
  supportPhone: text('support_phone').notNull().default('+880 1894-828290'),
  supportEmail: text('support_email').notNull().default('hello@ecomate.app'),
  whatsappNumber: text('whatsapp_number').notNull().default('8801894828290'),
  messengerUrl: text('messenger_url').notNull().default('https://m.me/ecomate.app'),
  address: text('address').notNull().default('Tejgaon I/A, Dhaka 1208, Bangladesh'),
  isPricingVisible: boolean('is_pricing_visible').notNull().default(true),
  // --- Meta CAPI two-mode config (H-1/Decision 14, admin-configurable) -----------------
  /** 'instant' = full Lead on submit; 'validated' = light instant event on submit + full Lead on status trigger. */
  metaCapiMode: text('meta_capi_mode').notNull().default('instant'),
  /** Lead status whose transition triggers the full server-side Lead event in validated mode. '' = unconfigured (instant events only). */
  metaLeadStatusTrigger: text('meta_lead_status_trigger').notNull().default(''),
  /** Lightweight submit-time event name in validated mode (browser + server share it for dedup). */
  metaInstantEventName: text('meta_instant_event_name').notNull().default('LeadInitiated'),
  seoTitle: text('seo_title').default('EcoMate — Your Entire E-commerce Operation, Managed From One Place'),
  seoDescription: text('seo_description').default('Complete operating platform for high-volume e-commerce brands: multi-store sync, physical showrooms, smart barcode packing, courier COD reconciliation, and ledger.'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Landing Sections CMS Table (Editable headlines, subheadings, ordering, visibility)
export const landingSectionsTable = pgTable('landing_sections', {
  id: serial('id').primaryKey(),
  sectionKey: text('section_key').unique().notNull(),
  titleEn: text('title_en').notNull(),
  titleBn: text('title_bn').notNull(),
  subtitleEn: text('subtitle_en').default(''),
  subtitleBn: text('subtitle_bn').default(''),
  eyebrowEn: text('eyebrow_en').default(''),
  eyebrowBn: text('eyebrow_bn').default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  customConfig: jsonb('custom_config').default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Dynamic Pricing Plans Table
export const pricingPlansTable = pgTable('pricing_plans', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  tierSubtitleEn: text('tier_subtitle_en').notNull(),
  tierSubtitleBn: text('tier_subtitle_bn').notNull(),
  monthlyPrice: integer('monthly_price').notNull(),
  annualPrice: integer('annual_price').notNull(),
  currency: text('currency').notNull().default('৳'),
  orderVolume: text('order_volume').notNull(),
  usersIncluded: text('users_included').notNull(),
  showroomsIncluded: text('showrooms_included').notNull(),
  featuresEn: jsonb('features_en').notNull().default([]),
  featuresBn: jsonb('features_bn').notNull().default([]),
  excludedFeaturesEn: jsonb('excluded_features_en').default([]),
  ctaLabelEn: text('cta_label_en').notNull().default('Start with this tier'),
  ctaLabelBn: text('cta_label_bn').notNull().default('এই প্ল্যানে শুরু করুন'),
  isPopular: boolean('is_popular').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  // Prices are money: enforce non-negativity in Postgres, not in hopeful JS. App-level
  // validation is a courtesy; this is the guarantee.
  check('pricing_plans_monthly_price_non_negative', sql`${t.monthlyPrice} >= 0`),
  check('pricing_plans_annual_price_non_negative', sql`${t.annualPrice} >= 0`),
]);

// 4. Leads Management Table
export const leadsTable = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').default(''),
  dailyVolume: text('daily_volume').default('150 – 500 orders / day'),
  note: text('note').default(''),
  source: text('source').default('landing_page_lead_form'),
  utmSource: text('utm_source').default(''),
  utmCampaign: text('utm_campaign').default(''),
  status: text('status').notNull().default('New'), // New, Contacted, Qualified, Demo Scheduled, Won, Lost
  assignedTo: text('assigned_to').default('Unassigned'),
  internalNotes: text('internal_notes').default(''),
  licensePortalStatus: text('license_portal_status').notNull().default('Pending'), // Pending, Synced, Failed
  licensePortalError: text('license_portal_error').default(''),
  licensePortalSyncedAt: timestamp('license_portal_synced_at'),
  // --- Server-side conversion tracking (Task 13) ------------------------------------
  fbp: text('fbp').default(''),          // _fbp browser cookie value at submit time
  fbc: text('fbc').default(''),          // _fbc click-id cookie value at submit time
  eventId: text('event_id').default(''), // shared browser + CAPI deduplication id
  clientIp: text('client_ip').default(''),
  userAgent: text('user_agent').default(''),
  metaCapiStatus: text('meta_capi_status').notNull().default('Pending'), // Pending | Sent | Failed | Skipped
  metaCapiError: text('meta_capi_error').default(''),
  metaCapiSentAt: timestamp('meta_capi_sent_at'),
  // --- Consent (legal prerequisite, not a preference) --------------------------------
  consentGiven: boolean('consent_given').notNull().default(false),
  consentAt: timestamp('consent_at'),
  consentText: text('consent_text').default(''), // exact privacy-policy version accepted
  /**
   * Tracking consent (H-1/Decision 14): whether the visitor accepted Meta tracking
   * (`ecomate_consent` cookie = accepted at submit time). Distinct from `consentGiven`
   * (contact consent — every stored lead has it): an Essential-only visitor asks to be
   * contacted while refusing Pixel/CAPI. This boolean is the enforcement behind the
   * documented invariant "opted-out visitors never dispatch to Meta" — `metaCapiStatus`
   * text (`Skipped`) is the visible audit trail, this column is the gate every dispatch
   * path checks. Derived from the submitted consent payload at insert, never from clients.
   */
  trackingConsent: boolean('tracking_consent').notNull().default(false),
  /**
   * Sales ownership (Task 16 §1). A FK, not free text like the legacy `assignedTo` column:
   * "the row must still exist when the assignee is deleted" is exactly what SET NULL gives,
   * whereas a text name would go stale and point at nobody. The legacy column is left in
   * place so nothing that still reads it breaks.
   */
  assignedToId: integer('assigned_to_id').references(() => adminUsersTable.id, { onDelete: 'set null' }),
  /** When the sales team promised to call back. Drives the overdue-follow-up worklist. */
  followUpAt: timestamp('follow_up_at'),
  /**
   * Set by the retention cron (Task 16 §6) when the PII on this row was cleared. Present so
   * the job is idempotent (a second pass can see its own work) and so an auditor can tell
   * "never had PII" from "PII was removed".
   */
  anonymizedAt: timestamp('anonymized_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  // A tracked lead must carry the timestamp it was consented at; storing the consent text
  // without the moment (or vice versa) is exactly the record a regulator would reject.
  check('leads_consent_recorded_at_consent',
    sql`${t.consentGiven} = false OR (${t.consentAt} IS NOT NULL AND ${t.consentText} <> '')`),
  check('leads_meta_capi_status_valid',
    sql`${t.metaCapiStatus} IN ('Pending', 'Sent', 'Failed', 'Skipped')`),
  // `leads` is listed newest-first and filtered by status; without these the admin list
  // degrades to a sequential scan plus a sort as the table grows past a few thousand rows.
  index('leads_created_at_idx').on(t.createdAt),
  index('leads_status_created_idx').on(t.status, t.createdAt),
  // The overdue-follow-up query is `follow_up_at < now() AND status NOT IN (...)`.
  index('leads_follow_up_at_idx').on(t.followUpAt),
]);

// 5. Testimonials Table (Multi-format: quotes, videos, audio/podcast)
export const testimonialsTable = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  clientName: text('client_name').notNull(),
  clientRole: text('client_role').notNull(),
  companyName: text('company_name').notNull(),
  category: text('category').notNull(),
  location: text('location').notNull(),
  quoteEn: text('quote_en').notNull(),
  quoteBn: text('quote_bn').notNull(),
  websiteUrl: text('website_url').default(''),
  logoUrl: text('logo_url').default(''),
  videoUrl: text('video_url').default(''),
  videoDuration: text('video_duration').default(''),
  /**
   * Where the video lives (H-19): 'youtube' embeds via the YouTube player,
   * 'upload' plays the `video_url` directly in a `<video>` element. Public
   * rendering branches on this — a wrong value must degrade to the text card,
   * never to a broken embed.
   */
  videoProvider: text('video_provider').notNull().default('youtube'),
  /**
   * Image-testimonial photo (H-19). Distinct from `logo_url` (the company mark):
   * this is the client/product photo the image card renders.
   */
  imageUrl: text('image_url').default(''),
  /** Optional 1–5 client rating. NULL = not given (never 0 — 0 would read as a score). */
  rating: integer('rating'),
  format: text('format').notNull().default('text'), // video_short | video_standard | image | text
  metrics: jsonb('metrics').default([]), // [{ label, stat }]
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  deletedAt: timestamp('deleted_at'), // soft delete (is_published only controls visibility)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // The public list reads `WHERE deleted_at IS NULL ORDER BY sort_order`, which had no
  // index until Task 16 made the read paginated (sort before slice).
  index('testimonials_sort_order_idx').on(t.sortOrder),
]);

// 6. Case Studies Table (Detailed problem -> solution -> outcome)
export const caseStudiesTable = pgTable('case_studies', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  client: text('client').notNull(),
  businessType: text('business_type').notNull(),
  problemOverview: text('problem_overview').notNull(),
  solutionImplemented: text('solution_implemented').notNull(),
  quantifiedOutcome: text('quantified_outcome').notNull(),
  metrics: jsonb('metrics').default([]),
  featuredImageUrl: text('featured_image_url').default(''),
  videoUrl: text('video_url').default(''),
  websiteUrl: text('website_url').default(''),
  isPublished: boolean('is_published').notNull().default(true),
  seoTitle: text('seo_title').default(''),
  seoDescription: text('seo_description').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Blog / SEO Articles Table
export const blogPostsTable = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  // No plain UNIQUE here: uniqueness is enforced by a *partial* unique index on live
  // slugs (see the table config below), so a soft-deleted post frees its slug for reuse
  // while every non-deleted slug stays unique. A full unique constraint would make slug
  // reuse after a soft delete impossible.
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  author: text('author').notNull().default('EcoMate Engineering Team'),
  category: text('category').notNull().default('Operations & Fulfillment'),
  tags: jsonb('tags').default([]),
  featuredImageUrl: text('featured_image_url').default(''),
  readTime: text('read_time').default('5 min read'),
  status: text('status').notNull().default('draft'), // draft, scheduled, published, archived
  seoTitle: text('seo_title').default(''),
  seoDescription: text('seo_description').default(''),
  canonicalUrl: text('canonical_url').default(''),
  deletedAt: timestamp('deleted_at'), // soft delete: hard-deleting a live URL is an SEO 404
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('blog_posts_slug_live_idx').on(t.slug).where(sql`${t.deletedAt} IS NULL`),
  // The list route sorts on `coalesce(published_at, created_at)`, so the index has to be an
  // expression index on that same expression — a plain index on `published_at` cannot serve the
  // sort, and Postgres falls back to sorting the whole filtered set before slicing.
  //
  // The column names are written as SQL identifiers rather than interpolated from
  // `blogPostsTable`: referencing the table inside its own initializer makes it self-referential
  // (TS7022) and the result is an implicit `any`. Static identifiers carry no injection risk.
  index('blog_posts_publish_order_idx').on(
    sql`coalesce("published_at", "created_at")`,
  ),
  check(
    'blog_posts_status_valid',
    sql`${t.status} IN ('draft', 'scheduled', 'published', 'archived')`,
  ),
]);

// 8. Media Library Assets Table
export const mediaAssetsTable = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  key: text('key').unique().notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  altText: text('alt_text').default(''),
  category: text('category').notNull().default('general'), // logo, hero, product_ui, customer_logo, og_image
  deletedAt: timestamp('deleted_at'), // soft delete: the R2 object is only purged when unreferenced
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // Media library is listed newest-first and filtered on `deleted_at`; without this the
  // paginated read sorts before it slices.
  index('media_assets_created_at_idx').on(t.createdAt),
]);

// 9. Integration Logs Table (Authoritative audit log of License Portal dispatches)
export const integrationLogsTable = pgTable('integration_logs', {
  id: serial('id').primaryKey(),
  serviceName: text('service_name').notNull().default('LicensePortal'),
  action: text('action').notNull(),
  payload: jsonb('payload').default({}),
  response: jsonb('response').default({}),
  status: text('status').notNull(), // Success, Failed, Pending
  errorMessage: text('error_message').default(''),
  attempts: integer('attempts').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // The integration-log viewer is a newest-first paginated read over a table that grows
  // without bound (every dispatch appends one row), so its sort column needs an index.
  index('integration_logs_created_at_idx').on(t.createdAt),
]);

// 10. Landing Content Table (whole-site, DB-driven, per-locale section payloads)
// `version` exists for optimistic locking, `status` for draft/publish and `deletedAt` for
// the soft-delete lifecycle every admin delete uses. The API upserts on
// (section_key, locale), which is why that pair carries a unique index.
export const landingContentTable = pgTable('landing_content', {
  id: serial('id').primaryKey(),
  sectionKey: text('section_key').notNull(),
  locale: text('locale').notNull().default('en'),
  content: jsonb('content').notNull().default({}),
  status: text('status').notNull().default('published'), // draft | published
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('landing_content_section_locale_idx').on(t.sectionKey, t.locale),
  check('landing_content_status_valid', sql`${t.status} IN ('draft', 'published')`),
  check('landing_content_version_positive', sql`${t.version} >= 1`),
]);

// 11. Social Links (footer + contact surfaces). Ordered, individually hideable, and
// deliberately not soft-deleted: a removed network is a one-row delete, and leaving a
// hidden row behind is what `isVisible` is for.
export const socialLinksTable = pgTable('social_links', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(), // facebook, youtube, linkedin, tiktok, instagram, x, whatsapp
  url: text('url').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
}, (t) => [
  uniqueIndex('social_links_platform_idx').on(t.platform),
  check('social_links_platform_valid',
    sql`${t.platform} IN ('facebook', 'youtube', 'linkedin', 'tiktok', 'instagram', 'x', 'whatsapp')`),
]);

// 12. Admin Users (operator identity + RBAC). Deliberately separate from Auth.js' `users`
// table: this one owns email + password hash + role and is keyed by a serial id, while
// Auth.js' `users` owns the session linkage and is keyed by text id. `auth.ts` joins the
// two on email.
export const adminUsersTable = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(), // "pbkdf2$600000$salt$hash"
  role: text('role').notNull().default('editor'), // superadmin | admin | editor
  isActive: boolean('is_active').notNull().default(true),
  /**
   * TOTP shared secret, AES-256-GCM encrypted as `v1:<iv>:<ciphertext>` (Task 14 §6).
   * Never plaintext: a leaked dump without the `TOTP_ENCRYPTION_KEY` runtime secret must
   * not hand over the second factor.
   */
  totpSecret: text('totp_secret'),
  /** Second factor confirmed with a valid code; login then requires one. */
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  check('admin_users_role_valid', sql`${t.role} IN ('superadmin', 'admin', 'editor')`),
]);

// 13. Admin Audit Log (logins, lockouts and every user-management mutation). The actor FK
// is SET NULL, never CASCADE: deleting an operator must not erase the history of what
// they did.
export const adminAuditLogsTable = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => adminUsersTable.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // LOGIN_OK, LOGIN_FAIL, LOGIN_LOCKED, USER_CREATE, USER_DEACTIVATE, PASSWORD_RESET, ROLE_CHANGE, SETUP_SUPERADMIN, SESSION_REVOKE
  target: text('target').default(''),
  ip: text('ip').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // Both login guards query `action = 'LOGIN_FAIL' AND <identity> AND created_at > now-n`:
  // one by email (per-account lockout), one by ip (per-client throttle).
  index('admin_audit_logs_target_created_idx').on(t.action, t.target, t.createdAt),
  index('admin_audit_logs_ip_created_idx').on(t.action, t.ip, t.createdAt),
]);

// 14. Auth.js identity tables. Written by hand on purpose: `DrizzleAdapter` takes an
// explicit table map and will not infer these. Column *names* must match what Auth.js
// queries (camelCase, quoted) — renaming them silently breaks the adapter.
//
// `sessions` doubles as this application's session registry (auth.ts issues the opaque
// token at sign-in), which is why it also records ip / userAgent / createdAt: the
// `/api/admin/users/[id]/sessions` view needs them to show revocable sessions.
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified'),
  image: text('image'),
});

export const accountsTable = pgTable('accounts', {
  userId: text('userId').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => [
  primaryKey({ columns: [t.provider, t.providerAccountId] }),
]);

export const sessionsTable = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
  ip: text('ip').notNull().default(''),
  userAgent: text('user_agent').notNull().default(''),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (t) => [
  // Task 16's retention cron sweeps on `expires`; the admin session list filters on userId.
  index('sessions_expires_idx').on(t.expires),
  index('sessions_user_idx').on(t.userId),
]);

export const verificationTokensTable = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (t) => [
  primaryKey({ columns: [t.identifier, t.token] }),
]);

// 15. Menus (DB-managed navigation). The site ships hardcoded nav inside
// `landing_content.header.nav`; these tables make it editable without a deploy, and they are
// strictly additive — a menu with no rows falls back to that hardcoded nav, so an empty
// table can never remove a working navigation link.
//
// `key` is a fixed vocabulary, not free text, because exactly two consumers exist: the
// header reads `main`, the footer reads `footer`. Unique on (key, locale) so one locale
// cannot end up with two competing nav bars.
export const menusTable = pgTable('menus', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(), // main | footer
  locale: text('locale').notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('menus_key_locale_idx').on(t.key, t.locale),
  check('menus_key_valid', sql`${t.key} IN ('main', 'footer')`),
]);

// 16. Menu Items. `menu_id` cascades: deleting a menu must not leave orphan links behind.
// The read order is `(menu_id, sort_order, id)` so a rename never reshuffles the bar.
//
// `parent_id` is a plain nullable integer rather than a self-referencing FK on purpose: it
// is a UI grouping hint for dropdowns, not a data-integrity edge. A self-FK would also make
// drizzle-kit emit a second unique constraint and would require the `AnyPgColumn` cast, for
// a relationship only ever written through `app/api/menus`. Referential integrity for it
// lives in that handler (a `parentId` must name a visible item of the *same* menu).
export const menuItemsTable = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  menuId: integer('menu_id').notNull().references(() => menusTable.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  href: text('href').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  parentId: integer('parent_id'),
}, (t) => [
  index('menu_items_menu_sort_idx').on(t.menuId, t.sortOrder),
]);

// 17b. Lead timeline (Task 16 §1). Every status change and every assignment change writes one
// row here, inside the same transaction as the `leads` update itself.
//
// `actor_id` is resolved server-side from the live session, never read from the request body:
// a client-supplied actor would make the entire history forgeable, which defeats the point of
// keeping a timeline at all.
//
// Both foreign keys cascade on lead delete / set null on operator delete — losing the timeline
// because an operator was removed would destroy the audit trail, and losing the actor name on
// an activity should not delete the event that happened.
export const leadActivitiesTable = pgTable('lead_activities', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .notNull()
    .references(() => leadsTable.id, { onDelete: 'cascade' }),
  actorId: integer('actor_id').references(() => adminUsersTable.id, { onDelete: 'set null' }),
  /**
   * Status transitions record both ends. Assignment and note events leave both empty, which
   * is why they default to `''` rather than being NULL — a timeline row is a "something
   * happened" marker and must never be filtered out by a null check in the drawer.
   */
  fromStatus: text('from_status').default(''),
  toStatus: text('to_status').default(''),
  note: text('note').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // The drawer reads one lead's history newest-first; this is the covering access path.
  index('lead_activities_lead_created_idx').on(t.leadId, t.createdAt),
]);

// 19. Managed Redirects (Task 15). `from_path` is unique because two rules for one path is
// ambiguous, and an ambiguous redirect is how a URL silently 500s in production.
// `to_path` is stored relative (`/new-path`) rather than absolute so a redirect created in
// staging still points at the same path in production.
export const redirectsTable = pgTable('redirects', {
  id: serial('id').primaryKey(),
  fromPath: text('from_path').unique().notNull(),
  toPath: text('to_path').notNull(),
  // 308 preserves the method and body; the default because a moved page must not lose a
  // POST. 301/302/307 stay legal for the cases that genuinely need them.
  statusCode: integer('status_code').notNull().default(308),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  check('redirects_status_code_valid', sql`${t.statusCode} IN (301, 302, 307, 308)`),
]);

// 20b. Dispatch Retry Queue (Task 20 §4).
//
// Durable retry for outbound integrations (Meta CAPI today, License Portal today,
// order-transfer tomorrow). The first attempt runs inline via `ctx.waitUntil`
// from the lead POST; only a failure lands here, and the drain cron retries with
// exponential backoff (1m, 5m, 30m, 2h, 12h, then `Failed`).
//
// Adding order-transfer later MUST reuse this table unchanged: it is keyed by
// (`kind`, `lead_id`) with an opaque jsonb `payload`, so a new `kind` value is a
// new producer/consumer, not a migration.
export const dispatchQueueTable = pgTable('dispatch_queue', {
  id: serial('id').primaryKey(),
  /** Integration kind: 'meta-capi' | 'license-portal' | future 'order-transfer'. */
  kind: text('kind').notNull(),
  leadId: integer('lead_id')
    .notNull()
    .references(() => leadsTable.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').notNull().default({}),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at').notNull().defaultNow(),
  lastError: text('last_error').default(''),
  /** Pending → retried by the drain cron → Done on success, Failed when backoff is exhausted. */
  status: text('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  check('dispatch_queue_status_valid',
    sql`${t.status} IN ('Pending', 'Retrying', 'Done', 'Failed')`),
  index('dispatch_queue_due_idx').on(t.status, t.nextAttemptAt),
  index('dispatch_queue_lead_idx').on(t.leadId),
]);

// 20. Content Revisions (Task 19). Forward-only history for every content domain.
//
// A content row without its revisions is untraceable history: the row says what the site
// shows *now*, and this table says what it showed at every point before, who changed it
// and why. Drafts of a published section live here — not on the live row — so staging an
// edit can never take the public copy down with it; `POST .../publish` promotes the latest
// draft onto the row, and `POST .../restore` re-applies an old payload as a *new* row here
// (history is never deleted, only appended to).
//
// `entity` names the domain table (`landing_content` | `blog_post` | ...), `entity_key` the
// row inside it (`hero:en` for landing content, the numeric id for blog posts, `'1'` for
// the singleton settings row). `version` is per-key (`max(version)+1` inside the same
// transaction as the content write), so two domains never share a sequence and a gap in
// one key's history is always a real deletion, never cross-talk.
export const contentRevisionsTable = pgTable('content_revisions', {
  id: serial('id').primaryKey(),
  entity: text('entity').notNull(), // landing_content | blog_post | pricing_plan | case_study | testimonial | site_settings
  entityKey: text('entity_key').notNull(), // sectionKey:locale | id | '1'
  version: integer('version').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull(), // draft | published
  actorId: integer('actor_id').references(() => adminUsersTable.id, { onDelete: 'set null' }),
  note: text('note').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  // The restore/publish reads are always "this key's history, newest first".
  index('content_revisions_entity_key_version_idx').on(t.entity, t.entityKey, t.version),
  check('content_revisions_status_valid', sql`${t.status} IN ('draft', 'published')`),
  check('content_revisions_version_positive', sql`${t.version} >= 1`),
]);
