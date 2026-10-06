/**
 * API DTOs for the admin client (`src/services/api.ts`).
 *
 * These describe the JSON shapes exchanged over `/api/*`. They used to live in the legacy
 * `src/db/index.ts` in-memory repository, which also constructed a `pg` Pool at module
 * load — importing it from a Client Component risked pulling the Node Postgres driver into
 * the browser bundle. The repository is gone; these types are plain, dependency-free data
 * shapes so nothing server-only can follow them into client code.
 *
 * Timestamps are ISO strings, not `Date`: they have crossed `JSON.stringify` by the time a
 * caller sees them, so typing them as `Date` would be a lie the compiler could not catch.
 */

export interface SiteSettings {
  id: number;
  siteName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLocale: 'en' | 'bn';
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  messengerUrl: string;
  address: string;
  isPricingVisible: boolean;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandingSection {
  id: number;
  sectionKey: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  eyebrowEn: string;
  eyebrowBn: string;
  sortOrder: number;
  isVisible: boolean;
  customConfig?: unknown;
}

export interface PricingPlan {
  id: number;
  slug: string;
  nameEn: string;
  nameBn: string;
  tierSubtitleEn: string;
  tierSubtitleBn: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  orderVolume: string;
  usersIncluded: string;
  showroomsIncluded: string;
  featuresEn: string[];
  featuresBn: string[];
  excludedFeaturesEn?: string[];
  ctaLabelEn: string;
  ctaLabelBn: string;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  dailyVolume: string;
  note: string;
  source: string;
  utmSource?: string;
  utmCampaign?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Demo Scheduled' | 'Won' | 'Lost';
  assignedTo: string;
  internalNotes: string;
  licensePortalStatus: 'Pending' | 'Synced' | 'Failed';
  licensePortalError?: string;
  licensePortalSyncedAt?: string;
  // Server-side conversion tracking + consent (Task 13).
  metaCapiStatus: 'Pending' | 'Sent' | 'Failed' | 'Skipped';
  metaCapiError?: string;
  metaCapiSentAt?: string;
  eventId?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
  consentGiven: boolean;
  consentAt?: string;
  consentText?: string;
  // Sales ownership + retention (Task 16).
  /** `admin_users.id`, or null when unassigned or the operator was deleted. */
  assignedToId?: number | null;
  followUpAt?: string | null;
  /** Set once the retention cron cleared this lead's PII. */
  anonymizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One entry in a lead's timeline (Task 16 §1). */
export interface LeadActivity {
  id: number;
  /** `admin_users.id`, or null when the event was system-initiated or the actor was deleted. */
  actorId: number | null;
  fromStatus: string;
  toStatus: string;
  note: string;
  createdAt: string;
}

/** Row shape of the overdue-follow-up worklist (`GET /api/leads?overdue=1`). */
export interface OverdueLead {
  id: number;
  name: string;
  phone: string;
  status: string;
  assignedToId: number | null;
  assignedTo: string;
  followUpAt: string | null;
}

/** `GET /api/ready` response (Task 16 §7). */
export interface ReadinessCheck {
  status: 'ok' | 'failed' | 'not_configured';
  latencyMs: number;
  error?: string;
}

export interface ReadinessReport {
  status: 'ready' | 'degraded' | 'not_ready';
  checks: {
    database: ReadinessCheck;
    storage: ReadinessCheck;
    cache: ReadinessCheck;
  };
  notificationProvider: 'configured' | 'log_only';
  requestId: string;
  timestamp: string;
}

export interface Testimonial {
  id: number;
  clientName: string;
  clientRole: string;
  companyName: string;
  category: string;
  location: string;
  quoteEn: string;
  quoteBn: string;
  websiteUrl: string;
  logoUrl: string;
  videoUrl: string;
  videoDuration: string;
  format: string;
  metrics: { label: string; stat: string }[];
  sortOrder: number;
  isPublished: boolean;
}

export interface CaseStudy {
  id: number;
  slug: string;
  title: string;
  client: string;
  businessType: string;
  problemOverview: string;
  solutionImplemented: string;
  quantifiedOutcome: string;
  metrics: { label: string; stat: string }[];
  featuredImageUrl: string;
  videoUrl: string;
  websiteUrl: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  featuredImageUrl: string;
  readTime: string;
  status: 'draft' | 'published' | 'scheduled';
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  publishedAt: string;
}

export interface MediaAsset {
  id: number;
  key: string;
  title: string;
  url: string;
  altText: string;
  category: string;
}

export interface IntegrationLog {
  id: number;
  serviceName: string;
  action: string;
  payload: unknown;
  response: unknown;
  status: 'Success' | 'Failed' | 'Pending';
  errorMessage?: string;
  attempts: number;
  createdAt: string;
}

/** One `landing_content` row as the CMS editor sees it (Task 15 §6). */
export interface LandingContentRow {
  id: number;
  sectionKey: string;
  locale: 'en' | 'bn';
  content: unknown;
  status: 'draft' | 'published';
  version: number;
  updatedAt: string;
}

/**
 * `GET /api/admin/i18n-report` response.
 *
 * `gapCount` is what the dashboard badge renders; `gaps` is the per-section worklist. `empty`
 * (a `bn` row that exists but holds nothing) is separated from `missing` (no row at all)
 * because a half-finished translation and an unstarted one are different jobs.
 */
export interface I18nReport {
  gapCount: number;
  gaps: { sectionKey: string; reason: 'missing' | 'empty' }[];
  /** Bangla sections with no English source — usually a mistyped `section_key`. */
  orphans: string[];
  englishSectionCount: number;
  translatedSectionCount: number;
}
