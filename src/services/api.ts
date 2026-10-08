import type {
  SiteSettings,
  LandingSection,
  LandingContentRow,
  PricingPlan,
  Lead,
  Testimonial,
  CaseStudy,
  BlogPost,
  MediaAsset,
  IntegrationLog,
  I18nReport,
  LeadActivity,
  OverdueLead,
  ReadinessReport,
} from '../types/api';

/** The admin list sizes the pager with: well past the server's 20-row default. */
export const ADMIN_LIST_LIMIT = 100;

const API_BASE = '/api';

/**
 * The paginated envelope every list route returns (Task 16 §4): `{ data, total, limit, offset }`.
 *
 * `Page<T>` describes the wire shape; the `PageResult<T>` getters below return only `.data`, so
 * the admin components keep treating a list as an array. That is the deliberate seam — the
 * envelope is a transport detail, and threading `total` through six call sites that only render
 * rows would be churn with no behavioural gain. A consumer that needs the count (the leads
 * pager, the export warning) calls the `*Page` variant.
 */
export interface Page<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PageParams {
  limit?: number;
  offset?: number;
}

/** Build the query string. Omitted params are left off so the server's defaults apply. */
function pageQuery(params?: PageParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.limit !== undefined) parts.push(`limit=${encodeURIComponent(params.limit)}`);
  if (params.offset !== undefined) parts.push(`offset=${encodeURIComponent(params.offset)}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * One shared unwrap for every list endpoint.
 *
 * `fetchList` returns the full envelope; `fetchListData` returns just the rows. Two functions
 * rather than one flag, because a caller that has to remember a boolean at each of a dozen call
 * sites is a caller that will eventually get it wrong.
 */
async function fetchList<T>(path: string, params?: PageParams): Promise<Page<T>> {
  const res = await fetch(`${API_BASE}${path}${pageQuery(params)}`);
  if (!res.ok) throw new Error('Failed to fetch list');
  const body: unknown = await res.json();
  // Tolerate a legacy bare-array response. Every list route is migrated, but a stale cached
  // JS bundle asking an older Worker shape would otherwise render an empty admin console.
  if (Array.isArray(body)) {
    return { data: body as T[], total: body.length, limit: body.length, offset: 0 };
  }
  const envelope = body as Partial<Page<T>>;
  return {
    data: Array.isArray(envelope.data) ? envelope.data : [],
    total: typeof envelope.total === 'number' ? envelope.total : 0,
    limit: typeof envelope.limit === 'number' ? envelope.limit : 0,
    offset: typeof envelope.offset === 'number' ? envelope.offset : 0,
  };
}

async function fetchListData<T>(path: string, params?: PageParams): Promise<T[]> {
  const page = await fetchList<T>(path, params);
  return page.data;
}

import { throwApiError } from '../components/admin/fieldErrors';

/**
 * A 409 optimistic-locking conflict (Task 19 §5). Carries the server's current row so the
 * editor can show what changed instead of a bare error toast.
 */
export class ApiConflictError extends Error {
  readonly status = 409;
  readonly serverRow: LandingContentRow | null;

  constructor(message: string, serverRow: LandingContentRow | null) {
    super(message);
    this.name = 'ApiConflictError';
    this.serverRow = serverRow;
  }
}

/** Throw `ApiConflictError` for a 409, `ApiValidationError` otherwise. */
async function throwConflictAwareError(response: Response, fallback: string): Promise<never> {
  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 409) {
    const details =
      typeof payload === 'object' && payload !== null
        ? (payload as { details?: { current?: unknown } }).details
        : undefined;
    const current = details?.current;
    const serverRow =
      typeof current === 'object' && current !== null ? (current as LandingContentRow) : null;
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : fallback;
    throw new ApiConflictError(message || fallback, serverRow);
  }
  return throwApiError(response, fallback);
}

export async function getSettings(): Promise<SiteSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update settings');
  return res.json();
}

export async function getSections(): Promise<LandingSection[]> {
  const res = await fetch(`${API_BASE}/sections`);
  if (!res.ok) throw new Error('Failed to fetch sections');
  return res.json();
}

export async function updateSection(id: number, data: Partial<LandingSection>): Promise<LandingSection> {
  const res = await fetch(`${API_BASE}/sections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update section');
  return res.json();
}

export async function getPricing(): Promise<{ isPricingVisible: boolean; plans: PricingPlan[] }> {
  const res = await fetch(`${API_BASE}/pricing`);
  if (!res.ok) throw new Error('Failed to fetch pricing');
  return res.json();
}

export async function createPricingPlan(data: Partial<PricingPlan>): Promise<PricingPlan> {
  const res = await fetch(`${API_BASE}/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create plan');
  return res.json();
}

export async function updatePricingPlan(id: number, data: Partial<PricingPlan>): Promise<PricingPlan> {
  const res = await fetch(`${API_BASE}/pricing/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update plan');
  return res.json();
}

export async function deletePricingPlan(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/pricing/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete plan');
  const data = await res.json();
  return data.success;
}

export async function togglePricingMode(): Promise<{ isPricingVisible: boolean }> {
  const res = await fetch(`${API_BASE}/pricing/toggle-mode`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle pricing mode');
  return res.json();
}

export async function submitLead(leadData: {
  name: string;
  phone: string;
  email?: string;
  dailyVolume?: string;
  note?: string;
  source?: string;
  utmSource?: string;
  utmCampaign?: string;
  /** Required by `POST /api/leads`: consent is a legal prerequisite, not an option. */
  consentGiven: boolean;
  /** Privacy-policy version the visitor accepted (stored on the lead row). */
  consentText?: string;
  /** Shared with the server-side CAPI event so Meta deduplicates the pair. */
  eventId?: string;
  fbp?: string;
  fbc?: string;
}): Promise<{
  success: boolean;
  leadId: number;
  message: string;
  /**
   * Present only when a lead with the same phone was submitted in the last 90 days. A warning,
   * not a rejection — the form surfaces it so the visitor knows, and the operator sees the
   * matched id in the admin drawer.
   */
  duplicateWarning?: { leadId: number; createdAt: string; status: string };
}> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData),
  });
  if (!res.ok) await throwApiError(res, 'Failed to submit demo request');
  return res.json();
}

/** Full page of leads, for the admin pager. */
export function getLeadsPage(params?: PageParams): Promise<Page<Lead>> {
  return fetchList<Lead>('/leads', params);
}

/** Leads whose promised follow-up has passed and which are not yet closed (Task 16 §2). */
export function getOverdueLeadsPage(params?: PageParams): Promise<Page<OverdueLead>> {
  const query = pageQuery({ limit: params?.limit, offset: params?.offset });
  return fetchList<OverdueLead>(`/leads${query}${query ? '&' : '?'}overdue=1`);
}

export async function getLeads(params?: PageParams): Promise<Lead[]> {
  return fetchListData<Lead>('/leads', params);
}

export async function updateLeadStatus(
  id: number,
  status: Lead['status'],
  internalNotes?: string,
): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, internalNotes }),
  });
  if (!res.ok) throw new Error('Failed to update lead status');
  return res.json();
}

/**
 * Status + assignment + follow-up in one call (Task 16 §1).
 *
 * One endpoint on purpose: the server writes the lead row and its timeline entries in a single
 * transaction, so splitting these into separate calls would leave a status change with no
 * recorded actor whenever the follow-up write failed.
 */
export async function updateLead(
  id: number,
  patch: {
    status?: Lead['status'];
    assignedToId?: number | null;
    followUpAt?: string | null;
    internalNotes?: string;
    note?: string;
  },
): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update lead');
  return res.json();
}

/** One lead's timeline, newest first. */
export function getLeadActivities(id: number, params?: PageParams): Promise<Page<LeadActivity>> {
  return fetchList<LeadActivity>(`/leads/${id}/activities`, params);
}

/** Operators who can own a lead (for the assignment picker). */
export async function getAssignableOperators(): Promise<{ id: number; email: string }[]> {
  const res = await fetch(`${API_BASE}/admin/users`);
  if (!res.ok) throw new Error('Failed to fetch operators');
  const body: unknown = await res.json();
  const list = Array.isArray(body)
    ? body
    : typeof body === 'object' && body !== null && Array.isArray((body as { users?: unknown }).users)
      ? (body as { users: unknown[] }).users
      : [];
  return list
    .filter((row): row is { id: number; email: string } => {
      if (typeof row !== 'object' || row === null) return false;
      const candidate = row as { id?: unknown; email?: unknown };
      return typeof candidate.id === 'number' && typeof candidate.email === 'string';
    })
    .map((row) => ({ id: row.id, email: row.email }));
}

/** Download URL for the lead CSV export. The browser follows it, so the session cookie rides along. */
export function leadExportUrl(): string {
  return `${API_BASE}/leads/export?format=csv`;
}

export async function retryLeadLicenseSync(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/leads/${id}/sync-license`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry license sync');
  return res.json();
}

/** Retries the Meta CAPI dispatch for a lead whose `metaCapiStatus` is Failed/Skipped. */
export async function retryLeadMetaSync(id: number): Promise<{
  metaCapiStatus: string;
  licensePortalStatus: string;
}> {
  const res = await fetch(`${API_BASE}/leads/${id}/sync-meta`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry Meta CAPI dispatch');
  return res.json();
}

export async function getTestimonials(params?: PageParams): Promise<Testimonial[]> {
  return fetchListData<Testimonial>('/testimonials', params);
}

/** Full CMS list (drafts included) — admin console only, editor-allowed. */
export async function getAllTestimonials(params?: PageParams): Promise<Testimonial[]> {
  return fetchListData<Testimonial>('/admin/testimonials', params);
}

/** Full CMS list (drafts included) — admin console only, editor-allowed. */
export async function getAllCaseStudies(params?: PageParams): Promise<CaseStudy[]> {
  return fetchListData<CaseStudy>('/admin/case-studies', params);
}

export async function getCaseStudies(params?: PageParams): Promise<CaseStudy[]> {
  return fetchListData<CaseStudy>('/case-studies', params);
}

export async function createTestimonial(data: Partial<Testimonial>): Promise<Testimonial> {
  const res = await fetch(`${API_BASE}/testimonials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to create testimonial');
  return res.json();
}

export async function updateTestimonial(id: number, data: Partial<Testimonial>): Promise<Testimonial> {
  const res = await fetch(`${API_BASE}/testimonials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update testimonial');
  return res.json();
}

export async function deleteTestimonial(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/testimonials/${id}`, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res, 'Failed to delete testimonial');
}

export async function createCaseStudy(data: Partial<CaseStudy>): Promise<CaseStudy> {
  const res = await fetch(`${API_BASE}/case-studies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to create case study');
  return res.json();
}

export async function updateCaseStudy(idOrSlug: number | string, data: Partial<CaseStudy>): Promise<CaseStudy> {
  const res = await fetch(`${API_BASE}/case-studies/${idOrSlug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update case study');
  return res.json();
}

export async function deleteCaseStudy(idOrSlug: number | string): Promise<void> {
  const res = await fetch(`${API_BASE}/case-studies/${idOrSlug}`, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res, 'Failed to delete case study');
}

export async function getBlogPosts(params?: PageParams): Promise<BlogPost[]> {
  return fetchListData<BlogPost>('/blog', params);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/blog/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch blog post');
  return res.json();
}

export async function createBlogPost(post: Partial<BlogPost>): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/blog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });
  if (!res.ok) await throwApiError(res, 'Failed to create post');
  return res.json();
}

export async function updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/blog/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update post');
  return res.json();
}

export async function getMediaAssets(params?: PageParams): Promise<MediaAsset[]> {
  return fetchListData<MediaAsset>('/media', params);
}

export async function createMediaAsset(asset: Partial<MediaAsset>): Promise<MediaAsset> {
  const res = await fetch(`${API_BASE}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  });
  if (!res.ok) throw new Error('Failed to create media asset');
  return res.json();
}

export async function getIntegrationLogs(params?: PageParams): Promise<IntegrationLog[]> {
  return fetchListData<IntegrationLog>('/integrations/logs', params);
}

export async function getSystemHealth(): Promise<{ status: string; uptime: number; postgresConfigured: boolean; licensePortalConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

/** Deep readiness (DB + R2 + KV). Returns the report even on 503 — the detail is the point. */
export async function getReadiness(): Promise<ReadinessReport> {
  const res = await fetch(`${API_BASE}/ready`, { cache: 'no-store' });
  const body: unknown = await res.json().catch(() => null);
  // A 503 is a legitimate answer from this endpoint, so it is not thrown: the admin needs the
  // per-dependency breakdown to diagnose, and that breakdown is in the 503 body.
  if (typeof body === 'object' && body !== null) return body as ReadinessReport;
  throw new Error('Failed to fetch readiness report');
}

/**
 * Both locales of one `landing_content` section, for the side-by-side EN|BN editor.
 *
 * `GET /api/content?locale=bn` returns the *merged public* payload, which is the wrong shape
 * for an editor: it has already had English merged into it, so the Bangla column would show
 * English text the translator is about to "translate" from a copy of itself. The editor needs
 * the raw rows, which is what `/api/content/[sectionKey]` reads.
 */
export async function getSectionPair(sectionKey: string): Promise<{
  en: LandingContentRow | null;
  bn: LandingContentRow | null;
}> {
  const read = async (locale: 'en' | 'bn'): Promise<LandingContentRow | null> => {
    const res = await fetch(`${API_BASE}/content/${encodeURIComponent(sectionKey)}?locale=${locale}`);
    // No row for this locale is a normal state (untranslated), not an error.
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch section content');
    const row: unknown = await res.json();
    if (typeof row !== 'object' || row === null) return null;
    return { ...(row as LandingContentRow), locale };
  };

  const [en, bn] = await Promise.all([read('en'), read('bn')]);
  return { en, bn };
}

/**
 * Save one locale of one section.
 *
 * `PUT /api/content/[sectionKey]` upserts on `(sectionKey, locale)`, so this is the only
 * write needed for a first translation as well as for an edit. `expectedVersion` is the
 * optimistic-locking token (Task 19 §5): the version the editor loaded. A save against a
 * row someone else moved throws `ApiConflictError` with their current row attached.
 *
 * A changed copy on a published row does NOT go live: the server stages it as a draft
 * revision and answers `{ staged: true, ... }` — the live copy moves only through
 * `publishSection` below.
 */
export async function saveSectionContent(
  sectionKey: string,
  locale: 'en' | 'bn',
  content: Record<string, unknown>,
  status: 'draft' | 'published' = 'published',
  expectedVersion?: number,
): Promise<LandingContentRow | { staged: true; revisionVersion: number; row: LandingContentRow }> {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(sectionKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale, content, status, expectedVersion }),
  });
  if (!res.ok) await throwConflictAwareError(res, 'Failed to save section content');
  return res.json();
}

/** Promote staged drafts to the live copy (Task 19 §3). Live immediately. */
export async function publishSection(
  sectionKey: string,
  locale: 'en' | 'bn',
): Promise<LandingContentRow> {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(sectionKey)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) await throwConflictAwareError(res, 'Failed to publish section');
  return res.json();
}

/** Re-apply a historical revision as a new version (Task 19 §4, forward-only). */
export async function restoreSection(
  sectionKey: string,
  locale: 'en' | 'bn',
  version: number,
): Promise<LandingContentRow> {
  const res = await fetch(`${API_BASE}/content/${encodeURIComponent(sectionKey)}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale, version }),
  });
  if (!res.ok) await throwConflictAwareError(res, 'Failed to restore revision');
  return res.json();
}

export interface ContentRevision {
  version: number;
  status: string;
  actorId: number | null;
  note: string;
  createdAt: string;
}

/** One key's forward-only history, newest first. */
export async function getSectionRevisions(
  sectionKey: string,
  locale: 'en' | 'bn',
): Promise<ContentRevision[]> {
  const res = await fetch(
    `${API_BASE}/content/${encodeURIComponent(sectionKey)}/revisions?locale=${locale}`,
  );
  if (!res.ok) throw new Error('Failed to fetch revision history');
  return res.json();
}

/** Which sections still have no usable Bangla translation. */
export async function getI18nReport(): Promise<I18nReport> {
  const res = await fetch(`${API_BASE}/admin/i18n-report`);
  if (!res.ok) throw new Error('Failed to fetch translation report');
  return res.json();
}
