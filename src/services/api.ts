import type { SiteSettings, LandingSection, PricingPlan, Lead, Testimonial, CaseStudy, BlogPost, MediaAsset, IntegrationLog } from '../types/api';

const API_BASE = '/api';

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
  if (!res.ok) throw new Error('Failed to update settings');
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
  if (!res.ok) throw new Error('Failed to update section');
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
}): Promise<{ success: boolean; leadId: number; message: string }> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit demo request');
  }
  return res.json();
}

export async function getLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_BASE}/leads`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function updateLeadStatus(id: number, status: Lead['status'], internalNotes?: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, internalNotes }),
  });
  if (!res.ok) throw new Error('Failed to update lead status');
  return res.json();
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

export async function getTestimonials(): Promise<Testimonial[]> {
  const res = await fetch(`${API_BASE}/testimonials`);
  if (!res.ok) throw new Error('Failed to fetch testimonials');
  return res.json();
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  const res = await fetch(`${API_BASE}/case-studies`);
  if (!res.ok) throw new Error('Failed to fetch case studies');
  return res.json();
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch(`${API_BASE}/blog`);
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
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
  if (!res.ok) throw new Error('Failed to create post');
  return res.json();
}

export async function updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/blog/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error('Failed to update post');
  return res.json();
}

export async function getMediaAssets(): Promise<MediaAsset[]> {
  const res = await fetch(`${API_BASE}/media`);
  if (!res.ok) throw new Error('Failed to fetch media');
  return res.json();
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

export async function getIntegrationLogs(): Promise<IntegrationLog[]> {
  const res = await fetch(`${API_BASE}/integrations/logs`);
  if (!res.ok) throw new Error('Failed to fetch integration logs');
  return res.json();
}

export async function getSystemHealth(): Promise<{ status: string; uptime: number; postgresConfigured: boolean; licensePortalConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}
