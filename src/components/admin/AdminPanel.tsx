import React, { useState, useEffect } from 'react';
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
} from '../../types/api';
import * as api from '../../services/api';
import { CONTENT_KEY_GROUPS } from '@/lib/contentKeys';
import { fieldErrorsOf, type FieldErrors } from './fieldErrors';
import { TestimonialForm } from './TestimonialForm';
import { ImagePickerField } from './ImagePickerField';
import { CaseStudyEditor } from './CaseStudyEditor';
import { MediaLibrary } from './MediaLibrary';
import { DashboardTab } from './tabs/DashboardTab';
import { LeadsTab } from './tabs/LeadsTab';
import { LeadDrawer } from './tabs/LeadDrawer';
import { ConfirmDialog } from './ui';
import { TestimonialCard } from '../TestimonialCard';
import { BlogPostEditor } from './BlogPostEditor';
import { BlogCategoryManager } from './BlogCategoryManager';
import { BlogTagManager } from './BlogTagManager';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  MessageSquareQuote,
  BookOpen,
  Image,
  Settings,
  Share2,
  RefreshCw,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  Filter,
  Save,
  Eye,
  EyeOff,
  Server,
  X,
  Languages,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'leads'
  | 'sections'
  | 'content'
  | 'pricing'
  | 'testimonials'
  | 'blog'
  | 'media'
  | 'settings'
  | 'integrations';

interface AdminPanelProps {
  onClose: () => void;
  locale: 'en' | 'bn';
  theme: 'light' | 'dark';
  initialTab?: AdminTab;
}

/** Inline validation message rendered against its input (Task 17 §5). Exported for the form islands. */
export const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
      {message}
    </p>
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, locale, theme, initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /**
   * Maintenance state (Task 20 §3): when the initial load fails (DB outage),
   * the console shows this banner with a retry instead of empty panels.
   */
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loaded Entities
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [pricing, setPricing] = useState<{ isPricingVisible: boolean; plans: PricingPlan[] }>({ isPricingVisible: true, plans: [] });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  // Media uses its own self-fetching library (Phase 3b Item 17) — no bulk fetch here.
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ status: string; uptime: number; postgresConfigured: boolean; licensePortalConfigured: boolean } | null>(null);
  /** In-flight cache purge scope; both purge buttons disable while non-null (double-click guard). */
  const [purging, setPurging] = useState<null | 'all' | 'landing'>(null);
  /** Confirm dialog scope for cache purge; null means no dialog. Buttons set it,
   *  the dialog confirms, then `runPurge` runs the existing async flow. */
  const [confirmScope, setConfirmScope] = useState<null | 'all' | 'landing'>(null);

  // --- Side-by-side EN|BN landing-content editor + translation report (Task 15 §6) -------
  const [i18nReport, setI18nReport] = useState<I18nReport | null>(null);
  /** The section currently open in the editor; `null` shows the translation-gap worklist. */
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editorRows, setEditorRows] = useState<{ en: LandingContentRow | null; bn: LandingContentRow | null }>({
    en: null,
    bn: null,
  });
  /** Raw textarea text per locale. Kept as text so a half-typed `{` is not a parse error. */
  const [editorDraft, setEditorDraft] = useState<{ en: string; bn: string }>({ en: '', bn: '' });
  const [editorErrors, setEditorErrors] = useState<{ en: string; bn: string }>({ en: '', bn: '' });
  const [isSavingEditor, setIsSavingEditor] = useState(false);
  /**
   * Optimistic-locking conflict (Task 19 §5): someone else saved this locale while the
   * editor was open. The operator's own draft stays in the textarea — nothing is lost —
   * and the banner below shows what changed and offers their version to load.
   */
  const [editorConflict, setEditorConflict] = useState<{
    locale: 'en' | 'bn';
    serverRow: LandingContentRow;
  } | null>(null);
  /** Revision history for the open section (Task 19 §4 rollback source). */
  const [revisionHistory, setRevisionHistory] = useState<{
    locale: 'en' | 'bn';
    rows: api.ContentRevision[];
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filters & Selected States
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('All');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // --- Lead timeline + follow-up worklist (Task 16) -------------------------------------
  /** Timeline for `selectedLead`, newest first. Separate state so opening a different lead
   *  never shows the previous lead's history while the fetch is in flight. */
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  /** Follow-up date being edited in the drawer, as `yyyy-mm-dd` for a date input. */
  const [followUpDraft, setFollowUpDraft] = useState('');
  /** Operators who can own a lead. Empty when the caller is an editor (endpoint is
   *  superadmin-only), which is why the picker degrades to a read-only display. */
  const [operators, setOperators] = useState<{ id: number; email: string }[]>([]);
  /** Leads whose promised follow-up has passed. Drives the dashboard worklist. */
  const [overdueLeads, setOverdueLeads] = useState<OverdueLead[]>([]);

  // Blog Editor State
  const [isEditingBlog, setIsEditingBlog] = useState(false);
  /** Per-field validation errors from the last failed settings/blog save (Task 17 §5). */
  const [settingsErrors, setSettingsErrors] = useState<FieldErrors>({});
  const [blogErrors, setBlogErrors] = useState<FieldErrors>({});
  const [editingPost, setEditingPost] = useState<Partial<BlogPost>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'Operations & Fulfillment',
    author: 'EcoMate Engineering Team',
    // Draft by default: publishing is an explicit choice in the form, never a
    // side effect of opening the composer.
    status: 'draft',
    readTime: '5 min read',
    tags: ['ecommerce', 'operations'],
  });
  const [blogSubTab, setBlogSubTab] = useState<'posts' | 'categories' | 'tags'>('posts');
  const [isBlogSaving, setIsBlogSaving] = useState(false);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState<string>('all');

  // Testimonial + case-study CMS state (H-19/H-20). A null draft means the list view;
  // a draft with no `id` is a create, with an `id` an edit.
  const [testimonialDraft, setTestimonialDraft] = useState<Partial<Testimonial> | null>(null);
  const [testimonialErrors, setTestimonialErrors] = useState<FieldErrors>({});
  const [testimonialSaving, setTestimonialSaving] = useState(false);
  const [caseStudyDraft, setCaseStudyDraft] = useState<Partial<CaseStudy> | null>(null);
  const [caseStudyErrors, setCaseStudyErrors] = useState<FieldErrors>({});
  const [caseStudySaving, setCaseStudySaving] = useState(false);

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // allSettled, not all: one role-gated fetch (e.g. settings for an editor)
      // must degrade its own panel instead of blanking every panel. Rejected
      // entries keep their previous state so a retry never flashes empty lists.
      const [
        sResult,
        secResult,
        pResult,
        lResult,
        tResult,
        csResult,
        bResult,
        iResult,
        hResult,
      ] = await Promise.allSettled([
        api.getSettings(),
        api.getSections(),
        api.getPricing(),
        // Every list endpoint is paginated (Task 16). The admin asks for the maximum page in
        // one shot rather than rendering a pager: an operator triaging leads needs the whole
        // working set on screen, and `MAX_LIMIT` (100) is the ceiling the server enforces anyway.
        api.getLeads({ limit: api.ADMIN_LIST_LIMIT }),
        // CMS lists read the admin paths (drafts included) — the public list endpoints
        // serve published rows only and would hide fresh drafts from this console.
        api.getAllTestimonials({ limit: api.ADMIN_LIST_LIMIT }),
        api.getAllCaseStudies({ limit: api.ADMIN_LIST_LIMIT }),
        api.getAllBlogPosts({ limit: api.ADMIN_LIST_LIMIT }),
        api.getIntegrationLogs({ limit: api.ADMIN_LIST_LIMIT }),
        api.getSystemHealth(),
      ]);

      let failures = 0;
      const take = <T,>(result: PromiseSettledResult<T>, apply: (value: T) => void): void => {
        if (result.status === 'fulfilled') apply(result.value);
        else {
          failures += 1;
          console.error('Failed to load admin data:', result.reason);
        }
      };
      take(sResult, setSettings);
      take(secResult, setSections);
      take(pResult, setPricing);
      take(lResult, setLeads);
      take(tResult, setTestimonials);
      take(csResult, setCaseStudies);
      take(bResult, setBlogPosts);
      take(iResult, setIntegrationLogs);
      take(hResult, setSystemHealth);
      if (failures > 0) {
        // Honest about the cause: role gates (403) and outages both land here, so
        // the message names neither — the per-request detail stays in the console.
        setLoadError(
          'Some admin data could not be loaded (check permissions and database connectivity). Panels below show what was reachable.',
        );
      }
      // Translation gaps are a dashboard-level signal, and the endpoint is superadmin/admin
      // only — so it is fetched on its own and a 403 leaves the badge at zero rather than
      // taking down the whole `Promise.all` (which would blank every panel for an editor).
      api
        .getI18nReport()
        .then(setI18nReport)
        .catch(() => setI18nReport(null));
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      // Maintenance state: the panels below render empty on a DB outage, so say
      // so explicitly and offer the retry. The message stays generic — the raw
      // driver error is in the console, not in front of the operator.
      setLoadError('The database could not be reached. Showing cached/empty data.');
    } finally {
      setIsLoading(false);
    }

    // The operator roster and the overdue worklist are fetched separately for the same reason
    // as the translation report: both are role-gated or non-essential, so a 403 must not blank
    // every panel by rejecting the shared `Promise.all` above.
    api
      .getAssignableOperators()
      .then(setOperators)
      .catch(() => setOperators([]));
    api
      .getOverdueLeadsPage({ limit: api.ADMIN_LIST_LIMIT })
      .then((page) => setOverdueLeads(page.data))
      .catch(() => setOverdueLeads([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  /**
   * Existing purge flow, extracted to a named function so both the Settings cache
   * card and the `ConfirmDialog` share one code path. Closes the dialog alongside
   * the toast on success and on failure.
   */
  const runPurge = async (scope: 'all' | 'landing'): Promise<void> => {
    setPurging(scope);
    try {
      const res = await api.purgeCache(scope);
      showNotification(
        scope === 'all'
          ? `Cache purged (${res.invalidated.length} tags)`
          : `Landing cache purged (${res.invalidated.length} tags)`,
      );
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setPurging(null);
      setConfirmScope(null);
    }
  };

  /**
   * Open one section in the EN|BN editor.
   *
   * Both locales are loaded at once and shown in adjacent columns: a translator working from
   * the English source needs them side by side, and switching between them to check a
   * paragraph means holding two screens in memory that they cannot see at the same time.
   */
  const handleOpenSection = async (sectionKey: string) => {
    setEditingSectionKey(sectionKey);
    setEditorErrors({ en: '', bn: '' });
    setEditorConflict(null);
    setRevisionHistory(null);
    try {
      const pair = await api.getSectionPair(sectionKey);
      setEditorRows(pair);
      setEditorDraft({
        en: pair.en ? JSON.stringify(pair.en.content, null, 2) : '',
        bn: pair.bn ? JSON.stringify(pair.bn.content, null, 2) : '',
      });
    } catch (err: any) {
      showNotification(`Failed to load ${sectionKey}: ${err.message}`);
      setEditorRows({ en: null, bn: null });
      setEditorDraft({ en: '', bn: '' });
    }
  };

  /**
   * Save one locale. Parsed, validated and rejected loudly rather than silently dropped.
   *
   * The save carries the row version the editor loaded (Task 19 §5): when someone else
   * saved first the server answers 409 and the conflict banner takes over instead of a
   * bare error toast. A changed copy on a published row is staged as a draft revision —
   * the live copy moves only through `handlePublishLocale` — so the status sent here is
   * the row's own (a first save creates the row published, as before).
   */
  const handleSaveLocale = async (locale: 'en' | 'bn') => {
    if (!editingSectionKey) return;
    const raw = editorDraft[locale].trim();
    if (raw === '') {
      setEditorErrors((prev) => ({ ...prev, [locale]: 'Empty payload — nothing to save.' }));
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      const candidate: unknown = JSON.parse(raw);
      if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
        throw new Error('payload must be a JSON object');
      }
      parsed = candidate as Record<string, unknown>;
    } catch (err: any) {
      setEditorErrors((prev) => ({ ...prev, [locale]: `Invalid JSON — ${err.message}` }));
      return;
    }

    setEditorErrors((prev) => ({ ...prev, [locale]: '' }));
    setIsSavingEditor(true);
    try {
      const status = editorRows[locale]?.status ?? 'published';
      const saved = await api.saveSectionContent(
        editingSectionKey,
        locale,
        parsed,
        status,
        editorRows[locale]?.version,
      );
      if (typeof saved === 'object' && saved !== null && 'staged' in saved && saved.staged) {
        // Changed copy on a published row: draft staged, live copy untouched. The row the
        // editor holds is still current, so no reload is needed — only a publish.
        setEditorConflict(null);
        showNotification(
          `${editingSectionKey} · ${locale.toUpperCase()} draft staged (revision ${saved.revisionVersion}) — Publish to go live`,
        );
        return;
      }
      const row = saved as LandingContentRow;
      setEditorRows((prev) => ({ ...prev, [locale]: row }));
      setEditorDraft((prev) => ({ ...prev, [locale]: JSON.stringify(row.content, null, 2) }));
      setEditorConflict(null);
      showNotification(`${editingSectionKey} · ${locale.toUpperCase()} saved`);
      // The gap count just changed; re-read it rather than guessing.
      api.getI18nReport().then(setI18nReport).catch(() => undefined);
    } catch (err: any) {
      if (err instanceof api.ApiConflictError && err.serverRow) {
        setEditorConflict({ locale, serverRow: err.serverRow });
        showNotification(`Save conflict on ${editingSectionKey} · ${locale.toUpperCase()} — see the banner`);
      } else {
        setEditorErrors((prev) => ({ ...prev, [locale]: err.message }));
        showNotification(`Save failed: ${err.message}`);
      }
    } finally {
      setIsSavingEditor(false);
    }
  };

  /** Promote staged drafts to the live copy (Task 19 §3). Live immediately. */
  const handlePublishLocale = async (locale: 'en' | 'bn') => {
    if (!editingSectionKey) return;
    setIsSavingEditor(true);
    try {
      const published = await api.publishSection(editingSectionKey, locale);
      setEditorRows((prev) => ({ ...prev, [locale]: published }));
      setEditorDraft((prev) => ({ ...prev, [locale]: JSON.stringify(published.content, null, 2) }));
      setEditorConflict(null);
      showNotification(`${editingSectionKey} · ${locale.toUpperCase()} published live`);
      api.getI18nReport().then(setI18nReport).catch(() => undefined);
    } catch (err: any) {
      if (err instanceof api.ApiConflictError && err.serverRow) {
        setEditorConflict({ locale, serverRow: err.serverRow });
        showNotification(`Publish conflict on ${editingSectionKey} · ${locale.toUpperCase()} — see the banner`);
      } else {
        showNotification(`Publish failed: ${err.message}`);
      }
    } finally {
      setIsSavingEditor(false);
    }
  };

  /** Load one locale's forward-only history for the rollback list (Task 19 §4). */
  const handleLoadHistory = async (locale: 'en' | 'bn') => {
    if (!editingSectionKey) return;
    setIsLoadingHistory(true);
    try {
      const rows = await api.getSectionRevisions(editingSectionKey, locale);
      setRevisionHistory({ locale, rows });
    } catch (err: any) {
      showNotification(`Failed to load history: ${err.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /** Re-apply a historical revision as a new live version (forward-only rollback). */
  const handleRestoreRevision = async (locale: 'en' | 'bn', version: number) => {
    if (!editingSectionKey) return;
    setIsSavingEditor(true);
    try {
      const restored = await api.restoreSection(editingSectionKey, locale, version);
      setEditorRows((prev) => ({ ...prev, [locale]: restored }));
      setEditorDraft((prev) => ({ ...prev, [locale]: JSON.stringify(restored.content, null, 2) }));
      setEditorConflict(null);
      const rows = await api.getSectionRevisions(editingSectionKey, locale);
      setRevisionHistory({ locale, rows });
      showNotification(
        `${editingSectionKey} · ${locale.toUpperCase()} restored to revision ${version} — live now`,
      );
    } catch (err: any) {
      showNotification(`Restore failed: ${err.message}`);
    } finally {
      setIsSavingEditor(false);
    }
  };

  /**
   * Top-level payload keys where the operator's draft and the server's current copy
   * disagree. Shown in the conflict banner so a non-technical operator sees *what*
   * changed ("headline, cta") rather than a wall of JSON.
   */
  const conflictDiffKeys = (serverContent: unknown, localRaw: string): string[] => {
    try {
      const local: unknown = JSON.parse(localRaw);
      if (typeof local !== 'object' || local === null || Array.isArray(local)) return [];
      const server =
        typeof serverContent === 'object' && serverContent !== null
          ? (serverContent as Record<string, unknown>)
          : {};
      const keys = new Set([...Object.keys(local as Record<string, unknown>), ...Object.keys(server)]);
      return [...keys].filter(
        (key) =>
          JSON.stringify((local as Record<string, unknown>)[key]) !== JSON.stringify(server[key]),
      );
    } catch {
      return [];
    }
  };

  /**
   * Load one lead's timeline for the drawer.
   *
   * Cleared first, and the id is re-checked after the await: an operator who clicks two leads
   * quickly would otherwise have the first lead's history land in the second lead's drawer.
   */
  const handleOpenLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setLeadActivities([]);
    setFollowUpDraft(toDateInputValue(lead.followUpAt));
    setIsLoadingTimeline(true);
    try {
      const page = await api.getLeadActivities(lead.id, { limit: api.ADMIN_LIST_LIMIT });
      if (selectedLead?.id === lead.id) setLeadActivities(page.data);
    } catch (err: any) {
      showNotification(`Failed to load timeline: ${err.message}`);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  /**
   * Status change. Routed through `updateLead` (one transaction, one timeline entry) rather
   * than the legacy status-only call, so the history can never be missing for a change the
   * drawer is showing.
   */
  const handleUpdateLeadStatus = async (id: number, status: Lead['status']) => {
    try {
      const updated = await api.updateLead(id, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setSelectedLead((prev) => (prev?.id === id ? updated : prev));
      showNotification(`Lead #${id} status updated to ${status}`);
      await refreshTimeline(id);
      await refreshOverdue();
    } catch (err: any) {
      showNotification(`Error updating lead: ${err.message}`);
    }
  };

  /** Re-read the timeline for the open lead after a mutation that wrote to it. */
  const refreshTimeline = async (leadId: number) => {
    try {
      const page = await api.getLeadActivities(leadId, { limit: api.ADMIN_LIST_LIMIT });
      setLeadActivities(page.data);
    } catch {
      // A stale timeline is a cosmetic problem; the mutation itself already succeeded and its
      // own error path has reported to the operator.
    }
  };

  const refreshOverdue = async () => {
    try {
      const page = await api.getOverdueLeadsPage({ limit: api.ADMIN_LIST_LIMIT });
      setOverdueLeads(page.data);
    } catch {
      setOverdueLeads([]);
    }
  };

  /** Assignment change. Logged as an activity server-side, same transaction as the write. */
  const handleAssignLead = async (leadId: number, assignedToId: number | null) => {
    try {
      const updated = await api.updateLead(leadId, { assignedToId });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev?.id === leadId ? updated : prev));
      showNotification(
        assignedToId === null
          ? `Lead #${leadId} unassigned`
          : `Lead #${leadId} assigned to ${operators.find((o) => o.id === assignedToId)?.email ?? `operator #${assignedToId}`}`,
      );
      await refreshTimeline(leadId);
    } catch (err: any) {
      showNotification(`Error assigning lead: ${err.message}`);
    }
  };

  /** Follow-up scheduling. `''` clears it — the server distinguishes that from a bad date. */
  const handleSaveFollowUp = async (lead: Lead) => {
    const trimmed = followUpDraft.trim();
    const followUpAt = trimmed === '' ? null : new Date(`${trimmed}T09:00:00`).toISOString();
    try {
      const updated = await api.updateLead(lead.id, { followUpAt });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      setSelectedLead((prev) => (prev?.id === lead.id ? updated : prev));
      showNotification(
        followUpAt === null ? `Follow-up cleared for lead #${lead.id}` : `Follow-up set for lead #${lead.id}`,
      );
      await refreshTimeline(lead.id);
      await refreshOverdue();
    } catch (err: any) {
      showNotification(`Error saving follow-up: ${err.message}`);
    }
  };

  const handleRetryLicenseSync = async (id: number) => {
    try {
      const result = await api.retryLeadLicenseSync(id);
      showNotification(result.message || `Dispatched lead #${id} to License Portal integration queue`);
      const updatedLeads = await api.getLeads({ limit: api.ADMIN_LIST_LIMIT });
      setLeads(updatedLeads);
      const updatedLogs = await api.getIntegrationLogs({ limit: api.ADMIN_LIST_LIMIT });
      setIntegrationLogs(updatedLogs);
    } catch (err: any) {
      showNotification(`Sync failed: ${err.message}`);
    }
  };

  /**
   * Retries only the Meta CAPI dispatch. Safe against double-clicks: the server skips a
   * lead whose `metaCapiStatus` is already `Sent`, so a second click cannot duplicate the
   * conversion in Events Manager.
   */
  const handleRetryMetaSync = async (id: number) => {
    try {
      const result = await api.retryLeadMetaSync(id);
      showNotification(
        result.metaCapiStatus === 'Sent'
          ? `Lead #${id} converted: Meta CAPI accepted the Lead event`
          : `Meta CAPI status for lead #${id}: ${result.metaCapiStatus}`
      );
      const updatedLeads = await api.getLeads({ limit: api.ADMIN_LIST_LIMIT });
      setLeads(updatedLeads);
      const updatedLogs = await api.getIntegrationLogs({ limit: api.ADMIN_LIST_LIMIT });
      setIntegrationLogs(updatedLogs);
    } catch (err: any) {
      showNotification(`Meta CAPI sync failed: ${err.message}`);
    }
  };

  const handleTogglePricingMode = async () => {
    try {
      const res = await api.togglePricingMode();
      setPricing((prev) => ({ ...prev, isPricingVisible: res.isPricingVisible }));
      showNotification(`Pricing mode set to: ${res.isPricingVisible ? 'Visible Tiered' : 'Hidden / Contact Sales'}`);
    } catch (err: any) {
      showNotification(`Error toggling pricing mode: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSettingsErrors({});
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      showNotification('Site settings updated successfully');
    } catch (err: unknown) {
      setSettingsErrors(fieldErrorsOf(err));
      showNotification(`Error saving settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveBlogPost = async (postToSave: Partial<BlogPost>) => {
    setBlogErrors({});
    setIsBlogSaving(true);
    try {
      if (postToSave.id) {
        await api.updateBlogPost(postToSave.id, postToSave);
        showNotification('Article updated successfully');
      } else {
        await api.createBlogPost(postToSave);
        showNotification('New article created successfully');
      }
      setIsEditingBlog(false);
      const bData = await api.getAllBlogPosts({ limit: api.ADMIN_LIST_LIMIT });
      setBlogPosts(bData);
    } catch (err: unknown) {
      setBlogErrors(fieldErrorsOf(err));
      showNotification(`Error saving post: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsBlogSaving(false);
    }
  };

  const handleDeleteBlogPost = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete article "${title}"?`)) return;
    try {
      await api.deleteBlogPost(id);
      showNotification(`Article "${title}" deleted`);
      const bData = await api.getAllBlogPosts({ limit: api.ADMIN_LIST_LIMIT });
      setBlogPosts(bData);
    } catch (err: unknown) {
      showNotification(`Error deleting post: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Testimonial + case-study CMS handlers (H-19/H-20). Lists refresh from the admin
  // paths so a just-unpublished row stays visible as a draft instead of vanishing.
  const handleSaveTestimonial = async (data: Partial<Testimonial>) => {
    setTestimonialSaving(true);
    setTestimonialErrors({});
    try {
      if (testimonialDraft?.id) {
        await api.updateTestimonial(testimonialDraft.id, data);
        showNotification('Testimonial updated successfully');
      } else {
        await api.createTestimonial(data);
        showNotification('Testimonial created successfully');
      }
      setTestimonialDraft(null);
      setTestimonials(await api.getAllTestimonials({ limit: api.ADMIN_LIST_LIMIT }));
    } catch (err: unknown) {
      setTestimonialErrors(fieldErrorsOf(err));
      showNotification(`Error saving testimonial: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTestimonialSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id: number) => {
    if (!window.confirm('Delete this testimonial? It will no longer appear anywhere.')) return;
    try {
      await api.deleteTestimonial(id);
      setTestimonials(await api.getAllTestimonials({ limit: api.ADMIN_LIST_LIMIT }));
      showNotification('Testimonial deleted');
    } catch (err: unknown) {
      showNotification(`Error deleting testimonial: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveCaseStudy = async (data: Partial<CaseStudy>) => {
    setCaseStudySaving(true);
    setCaseStudyErrors({});
    try {
      if (caseStudyDraft?.id) {
        await api.updateCaseStudy(caseStudyDraft.id, data);
        showNotification('Case study updated successfully');
      } else {
        await api.createCaseStudy(data);
        showNotification('Case study created successfully');
      }
      setCaseStudyDraft(null);
      setCaseStudies(await api.getAllCaseStudies({ limit: api.ADMIN_LIST_LIMIT }));
    } catch (err: unknown) {
      setCaseStudyErrors(fieldErrorsOf(err));
      showNotification(`Error saving case study: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCaseStudySaving(false);
    }
  };

  const handleDeleteCaseStudy = async (idOrSlug: number | string) => {
    if (!window.confirm('Delete this case study? Its public page will 404.')) return;
    try {
      await api.deleteCaseStudy(idOrSlug);
      setCaseStudies(await api.getAllCaseStudies({ limit: api.ADMIN_LIST_LIMIT }));
      showNotification('Case study deleted');
    } catch (err: unknown) {
      showNotification(`Error deleting case study: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {    const matchesStatus = leadStatusFilter === 'All' || l.status === leadStatusFilter;
    const matchesSearch =
      l.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.phone.includes(leadSearchQuery) ||
      l.email.toLowerCase().includes(leadSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-[#07080E] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Admin Navigation Header */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D18] flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
            EM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-white">EcoMate Platform Admin</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Self-Contained CMS & DB
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Authoritative PostgreSQL & Content Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Refresh DB Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Back to Public Site</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Maintenance state (Task 20 §3): DB outage shows here with a retry. */}
      {loadError && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <span className="font-medium">{loadError}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Admin Layout: Sidebar + Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-56 sm:w-64 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#090B14] p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
          <nav className="space-y-4">
            {/* Group 1: Operations */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Operations
              </p>
              <div className="space-y-0.5">
                {[
                  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
                  { id: 'leads', label: 'Lead CRM', icon: Users, count: leads.filter((l) => l.status === 'New').length },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as AdminTab);
                        setIsEditingBlog(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Editorial & Blog */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Editorial &amp; Media
              </p>
              <div className="space-y-0.5">
                {[
                  { id: 'blog', label: 'Blog & Articles', icon: BookOpen, count: blogPosts.length },
                  { id: 'media', label: 'Media Library', icon: Image },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as AdminTab);
                        setIsEditingBlog(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Marketing CMS */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Marketing CMS
              </p>
              <div className="space-y-0.5">
                {[
                  { id: 'sections', label: 'Landing Sections', icon: FileText },
                  {
                    id: 'content',
                    label: 'Bilingual Strings',
                    icon: Languages,
                    count: i18nReport?.gapCount ?? 0,
                  },
                  { id: 'pricing', label: 'Dynamic Pricing', icon: DollarSign },
                  { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as AdminTab);
                        setIsEditingBlog(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 4: System */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                System
              </p>
              <div className="space-y-0.5">
                {[
                  { id: 'integrations', label: 'License Portal Queue', icon: Share2 },
                  { id: 'settings', label: 'System & Branding', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as AdminTab);
                        setIsEditingBlog(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Database & Integration Status Badge */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-xs space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">SQL Repository:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                Active (Authoritative)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">License Portal:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                {systemHealth?.licensePortalConfigured ? 'Connected' : 'Standby / Queue'}
              </span>
            </div>
          </div>
        </aside>

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              leads={leads}
              pricingModeLabel={pricing.isPricingVisible ? 'Tiered Visible' : 'Custom / Hidden'}
              onSwitchPricingMode={handleTogglePricingMode}
              sectionCount={sections.length}
              untranslatedCount={i18nReport ? i18nReport.gapCount : null}
              articleCount={blogPosts.length}
              overdueCount={overdueLeads.length}
              recentLeads={leads.slice(0, 4)}
              onOpenLeads={() => setActiveTab('leads')}
              onOpenContent={() => setActiveTab('content')}
              onOpenLead={handleOpenLead}
              onStatusChange={handleUpdateLeadStatus}
              onAddSection={() => setActiveTab('sections')}
              onWriteArticle={() => setActiveTab('blog')}
              onUploadMedia={() => setActiveTab('media')}
            />
          )}

          {/* TAB 2: LEAD MANAGEMENT */}
          {activeTab === 'leads' && (
            <LeadsTab
              leads={leads}
              filteredLeads={filteredLeads}
              overdueLeads={overdueLeads}
              leadSearchQuery={leadSearchQuery}
              leadStatusFilter={leadStatusFilter}
              exportUrl={api.leadExportUrl()}
              onSearchChange={setLeadSearchQuery}
              onStatusFilterChange={setLeadStatusFilter}
              onOpenLead={handleOpenLead}
              onStatusChange={handleUpdateLeadStatus}
              onRetryCapi={handleRetryMetaSync}
              onRetryPortal={handleRetryLicenseSync}
              onNotify={showNotification}
            />
          )}

          {/* TAB 3: SECTIONS CMS */}
          {activeTab === 'sections' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Landing Page Sections CMS</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Control section headlines, subtitles, language translations, ordering and live visibility without code changes.
                </p>
              </div>

              <div className="space-y-4">
                {sections.map((sec) => (
                  <div key={sec.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          #{sec.sortOrder} · {sec.sectionKey}
                        </span>
                        <span className="text-xs text-slate-400">({sec.eyebrowEn})</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sec.isVisible}
                            onChange={async (e) => {
                              const updated = await api.updateSection(sec.id, { isVisible: e.target.checked });
                              setSections((prev) => prev.map((s) => (s.id === sec.id ? updated : s)));
                              showNotification(`Section visibility updated`);
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span>Visible</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1 font-medium dark:text-slate-400">English Headline</label>
                        <input
                          type="text"
                          value={sec.titleEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, titleEn: val } : s)));
                          }}
                          onBlur={async () => {
                            await api.updateSection(sec.id, { titleEn: sec.titleEn });
                            showNotification('Headline saved');
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 mb-1 font-medium dark:text-slate-400">Bangla Headline (বাংলা)</label>
                        <input
                          type="text"
                          value={sec.titleBn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, titleBn: val } : s)));
                          }}
                          onBlur={async () => {
                            await api.updateSection(sec.id, { titleBn: sec.titleBn });
                            showNotification('Bangla headline saved');
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bangla"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BILINGUAL CONTENT EDITOR (EN | BN side by side) */}
          {activeTab === 'content' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    Bilingual Landing Content
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    One payload per locale, edited side by side. <strong>Fallback chain: a section with
                    no Bangla payload renders the English one</strong> — the page is never blank.
                  </p>
                </div>
                {editingSectionKey && (
                  <button
                    onClick={() => setEditingSectionKey(null)}
                    className="self-start inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    Close editor
                  </button>
                )}
              </div>

              {/* Translation-gap worklist */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-4 sm:p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Missing Bangla translations
                  </h3>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    {i18nReport
                      ? `${i18nReport.translatedSectionCount}/${i18nReport.englishSectionCount} sections translated`
                      : 'Report unavailable for this role'}
                  </span>
                </div>

                {!i18nReport ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Loading translation report…
                  </p>
                ) : i18nReport.gaps.length === 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Every English section has a published, non-empty Bangla payload.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {i18nReport.gaps.map((gap) => (
                      <li key={gap.sectionKey}>
                        <button
                          onClick={() => void handleOpenSection(gap.sectionKey)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                          {gap.sectionKey}
                          <span className="opacity-70">{gap.reason}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {i18nReport && i18nReport.orphans.length > 0 && (
                  <p className="mt-3 text-[11px] text-rose-700 dark:text-rose-300">
                    Bangla rows with no English source (check the section key):{' '}
                    <span className="font-mono">{i18nReport.orphans.join(', ')}</span>
                  </p>
                )}
              </div>

              {/* Section browser: every CMS key in page order, grouped so new keys
                  (dock, walkthrough, videoSection) are found where they render. */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-4 sm:p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  All sections (page order)
                </h3>
                <div className="space-y-3">
                  {CONTENT_KEY_GROUPS.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                        {group.title}
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {group.keys.map((key) => {
                          const gap = i18nReport?.gaps.find((entry) => entry.sectionKey === key);
                          return (
                            <li key={key}>
                              <button
                                onClick={() => void handleOpenSection(key)}
                                title={gap ? `Missing Bangla (${gap.reason}) — open to translate` : `Open ${key} in the editor`}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold cursor-pointer ${
                                  editingSectionKey === key
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200'
                                    : gap
                                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                              >
                                {key}
                                {gap && <span className="opacity-70">· {gap.reason}</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* EN | BN editor */}
              {editingSectionKey ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(['en', 'bn'] as const).map((locale) => {
                      const row = editorRows[locale];
                      const error = editorErrors[locale];
                      const conflict = editorConflict?.locale === locale ? editorConflict : null;
                      const diffKeys = conflict
                        ? conflictDiffKeys(conflict.serverRow.content, editorDraft[locale])
                        : [];
                      return (
                        <div
                          key={locale}
                          className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-4 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                              {locale === 'en' ? 'English (en)' : 'বাংলা (bn)'}
                              <span className="ml-2 font-mono font-normal text-[11px] text-slate-400">
                                {row
                                  ? `${row.status} · v${row.version}`
                                  : 'no row'}
                              </span>
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => void handlePublishLocale(locale)}
                                disabled={isSavingEditor || !row}
                                title="Promote staged drafts to the live page immediately"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                              >
                                Publish {locale.toUpperCase()}
                              </button>
                              <button
                                onClick={() => void handleSaveLocale(locale)}
                                disabled={isSavingEditor}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save {locale.toUpperCase()}
                              </button>
                            </div>
                          </div>

                          {/* Optimistic-locking conflict (Task 19 §5). The operator's draft
                              is untouched in the textarea below — loading their version is
                              explicit, never automatic, so a click cannot discard work. */}
                          {conflict && (
                            <div
                              role="alert"
                              className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                            >
                              <p className="font-bold">
                                Someone else saved this section at{' '}
                                {new Date(conflict.serverRow.updatedAt).toLocaleString()} (version{' '}
                                {conflict.serverRow.version}). Your edits are still in the editor
                                below — nothing was lost.
                              </p>
                              {diffKeys.length > 0 && (
                                <p className="mt-1">
                                  Fields they changed:{' '}
                                  <span className="font-mono font-semibold">{diffKeys.join(', ')}</span>
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorRows((prev) => ({ ...prev, [locale]: conflict.serverRow }));
                                    setEditorDraft((prev) => ({
                                      ...prev,
                                      [locale]: JSON.stringify(conflict.serverRow.content, null, 2),
                                    }));
                                    setEditorConflict(null);
                                  }}
                                  className="rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-800 cursor-pointer"
                                >
                                  Load their version
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditorConflict(null)}
                                  className="rounded-lg border border-amber-400 px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 cursor-pointer"
                                >
                                  Keep editing mine
                                </button>
                              </div>
                            </div>
                          )}

                          <textarea
                            value={editorDraft[locale]}
                            onChange={(e) =>
                              setEditorDraft((prev) => ({ ...prev, [locale]: e.target.value }))
                            }
                            spellCheck={false}
                            rows={18}
                            placeholder={locale === 'bn' ? 'অনুবাদ করলে এখানে JSON বসান…' : '{"headline": "..."}'}
                            className={`w-full rounded-xl bg-slate-50 dark:bg-black/40 border p-3 font-mono text-[11px] leading-relaxed text-slate-900 dark:text-white ${
                              error ? 'border-rose-400' : 'border-slate-200 dark:border-white/10'
                            } ${locale === 'bn' ? 'font-bangla' : ''}`}
                          />

                          {error && (
                            <p className="mt-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                              {error}
                            </p>
                          )}
                          {!row && !error && (
                            <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                              No {locale.toUpperCase()} row yet. Saving creates it.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Saving a published section stages a <strong>draft</strong> — the live page
                    keeps the old copy until you press <strong>Publish</strong>. Payload shape
                    must match the static copy in{' '}
                    <span className="font-mono">src/data/landingContent.ts</span> — keys the
                    payload omits keep their English value on merge.
                  </p>

                  {/* Revision history + forward-only rollback (Task 19 §4) */}
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-4 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                        Revision history
                      </h4>
                      {(['en', 'bn'] as const).map((locale) => (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => void handleLoadHistory(locale)}
                          disabled={isLoadingHistory}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                        >
                          {locale.toUpperCase()}
                        </button>
                      ))}
                      {isLoadingHistory && (
                        <span className="text-[11px] text-slate-500">Loading…</span>
                      )}
                    </div>
                    {revisionHistory && (
                      <div className="mt-3">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {revisionHistory.locale.toUpperCase()} — newest first. Restoring
                          applies the old copy as a <strong>new</strong> version; history is
                          never deleted.
                        </p>
                        {revisionHistory.rows.length === 0 ? (
                          <p className="mt-1 text-[11px] text-slate-500">No revisions yet.</p>
                        ) : (
                          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
                            {revisionHistory.rows.map((revision) => (
                              <li
                                key={revision.version}
                                className="flex items-center justify-between gap-3 py-1.5 text-[11px]"
                              >
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  v{revision.version} · {revision.status}
                                  {revision.note ? ` · ${revision.note}` : ''} ·{' '}
                                  {new Date(revision.createdAt).toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleRestoreRevision(revisionHistory.locale, revision.version)
                                  }
                                  disabled={isSavingEditor}
                                  className="rounded-lg border border-slate-200 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                                >
                                  Restore this
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Pick a section above to edit both locales, or open one from the gap list.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: PRICING CMS */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dynamic Pricing Manager</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    Toggle between Visible Tiered Pricing and Contact Sales / Custom Architecture mode.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePricingMode}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      pricing.isPricingVisible
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-600 text-white shadow-xs'
                    }`}
                  >
                    {pricing.isPricingVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{pricing.isPricingVisible ? 'Mode: Tiered Visible' : 'Mode: Hidden / Contact'}</span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricing.plans.map((plan) => (
                  <div key={plan.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-base text-slate-900 dark:text-white">{plan.nameEn}</span>
                        {plan.isPopular && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white mb-2">
                        {plan.currency} {plan.monthlyPrice.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-600 dark:text-slate-300">/ mo</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{plan.tierSubtitleEn}</p>

                      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-white/5 pt-3">
                        {plan.featuresEn.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0 dark:text-emerald-400" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Order Limit: {plan.orderVolume}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TESTIMONIALS & CASE STUDIES */}
          {activeTab === 'testimonials' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Proof & Case Studies CMS</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    Manage verifiable client testimonials, video interviews, and quantified ROI case studies.
                  </p>
                </div>
                {!testimonialDraft && (
                  <button
                    onClick={() => {
                      setTestimonialDraft({ format: 'text', isPublished: false, sortOrder: 0 });
                      setTestimonialErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Testimonial</span>
                  </button>
                )}
              </div>

              {testimonialDraft && (
                <TestimonialForm
                  initial={testimonialDraft}
                  errors={testimonialErrors}
                  saving={testimonialSaving}
                  onSubmit={handleSaveTestimonial}
                  onCancel={() => setTestimonialDraft(null)}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div key={t.id} className="relative">
                    {!t.isPublished && (
                      <span className="absolute -top-2 left-4 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        Draft
                      </span>
                    )}
                    <TestimonialCard data={t} locale="en" />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setTestimonialDraft({ ...t });
                          setTestimonialErrors({});
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Case Studies</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Long-form proof pages. A blank slug is generated from the title.
                  </p>
                </div>
                {!caseStudyDraft && (
                  <button
                    onClick={() => {
                      setCaseStudyDraft({ isPublished: false });
                      setCaseStudyErrors({});
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Case Study</span>
                  </button>
                )}
              </div>

              {caseStudyDraft && (
                <CaseStudyEditor
                  initial={caseStudyDraft}
                  errors={caseStudyErrors}
                  saving={caseStudySaving}
                  onSubmit={handleSaveCaseStudy}
                  onCancel={() => setCaseStudyDraft(null)}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caseStudies.map((cs) => (
                  <div key={cs.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{cs.title}</span>
                        {!cs.isPublished && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{cs.client} · <span className="font-mono">/{cs.slug}</span></p>
                      <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{cs.problemOverview}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setCaseStudyDraft({ ...cs });
                          setCaseStudyErrors({});
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCaseStudy(cs.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: BLOG & SEO PLATFORM */}
          {activeTab === 'blog' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {isEditingBlog ? (
                <BlogPostEditor
                  post={editingPost}
                  errors={blogErrors}
                  onSave={handleSaveBlogPost}
                  onCancel={() => setIsEditingBlog(false)}
                  saving={isBlogSaving}
                />
              ) : (
                <div className="space-y-5">
                  {/* Sub-navigation bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Blog &amp; Knowledge Engine
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        Publish high-authority guides optimized for 2026 AI search (Gemini, ChatGPT) and search engines.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100 dark:bg-white/5">
                        <button
                          type="button"
                          onClick={() => setBlogSubTab('posts')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            blogSubTab === 'posts'
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Articles ({blogPosts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlogSubTab('categories')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            blogSubTab === 'categories'
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Categories &amp; Tree
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlogSubTab('tags')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            blogSubTab === 'tags'
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Tags
                        </button>
                      </div>

                      {blogSubTab === 'posts' && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost({
                              title: '',
                              slug: '',
                              excerpt: '',
                              content: '',
                              category: 'Operations & Fulfillment',
                              categoryId: null,
                              author: 'EcoMate Operations Research',
                              status: 'draft',
                              readTime: '5 min read',
                              tags: ['ecommerce', 'operations'],
                              featuredImageUrl: '',
                              videoUrl: '',
                              galleryUrls: [],
                              seoTitle: '',
                              seoDescription: '',
                              canonicalUrl: '',
                            });
                            setBlogErrors({});
                            setIsEditingBlog(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Write Article</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-tab 1: Articles list */}
                  {blogSubTab === 'posts' && (
                    <div className="space-y-4">
                      {/* Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-[220px]">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={blogSearchQuery}
                            onChange={(e) => setBlogSearchQuery(e.target.value)}
                            placeholder="Search articles by title, slug, or category…"
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={blogStatusFilter}
                            onChange={(e) => setBlogStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-slate-900 dark:text-white cursor-pointer"
                          >
                            <option value="all">All Statuses</option>
                            <option value="published">Published Live</option>
                            <option value="draft">Drafts</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      {/* Articles List */}
                      {blogPosts.length === 0 ? (
                        <div className="text-center py-16 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500">
                          No blog posts found. Click &quot;Write Article&quot; to publish your first post.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {blogPosts
                            .filter((post) => {
                              const matchesStatus =
                                blogStatusFilter === 'all' || post.status === blogStatusFilter;
                              const matchesQuery =
                                !blogSearchQuery ||
                                post.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                                post.slug.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                                post.category.toLowerCase().includes(blogSearchQuery.toLowerCase());
                              return matchesStatus && matchesQuery;
                            })
                            .map((post) => (
                              <div
                                key={post.id}
                                className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-2xs"
                              >
                                <div className="flex items-start gap-3.5 min-w-0">
                                  {post.featuredImageUrl ? (
                                    <div className="relative h-14 w-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={post.featuredImageUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 dark:border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center text-indigo-500 text-xs font-mono font-bold">
                                      POST
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/30">
                                        {post.category}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                          post.status === 'published'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                        }`}
                                      >
                                        {post.status}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        /blog/{post.slug}
                                      </span>
                                    </div>
                                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                      {post.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-2xl">
                                      {post.excerpt}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  {post.status === 'published' && (
                                    <a
                                      href={`/en/blog/${post.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                      title="Open live post"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPost(post);
                                      setBlogErrors({});
                                      setIsEditingBlog(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBlogPost(post.id, post.title)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete article"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 2: Categories manager */}
                  {blogSubTab === 'categories' && <BlogCategoryManager />}

                  {/* Sub-tab 3: Tags manager */}
                  {blogSubTab === 'tags' && <BlogTagManager />}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: MEDIA SLOTS */}
          {activeTab === 'media' && <MediaLibrary />}

          {/* TAB 8: LICENSE PORTAL INTEGRATION QUEUE */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">External License Portal Integration Layer</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Asynchronous adapter queue. Dispatches validated leads to external License Portal API while keeping local records authoritative.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold">Architecture Contract Note:</p>
                <p className="mt-1 leading-relaxed">
                  The public marketing website and CMS are fully self-contained. The external License Management Portal is accessed strictly as an integration recipient. If the external portal is unavailable or offline, zero data is lost.
                </p>
              </div>

              {/* Logs */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 font-bold text-sm text-slate-900 dark:text-white">
                  Integration Dispatch Audit Logs
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {integrationLogs.map((log) => (
                    <div key={log.id} className="p-4 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          [{log.serviceName}] {log.action}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'Success'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                        {new Date(log.createdAt).toLocaleString()} · Attempts: {log.attempts}
                      </p>
                      {log.errorMessage && (
                        <p className="text-rose-700 dark:text-rose-300 text-[11px]">{log.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS & BRANDING */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">System Settings & Brand Identity</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  Global contact numbers, WhatsApp target, default locale, and meta parameters.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label htmlFor="settings-siteName" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Brand Site Name</label>
                    <input
                      id="settings-siteName"
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      aria-describedby={settingsErrors.siteName ? 'settings-siteName-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold"
                    />
                    <FieldError id="settings-siteName-error" message={settingsErrors.siteName} />
                  </div>

                  <div>
                    <label htmlFor="settings-defaultLocale" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Default Locale</label>
                    <select
                      id="settings-defaultLocale"
                      value={settings.defaultLocale}
                      onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value as unknown as SiteSettings['defaultLocale'] })}
                      aria-describedby={settingsErrors.defaultLocale ? 'settings-defaultLocale-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="en">English (Default)</option>
                      <option value="bn">Bangla (বাংলা)</option>
                    </select>
                    <FieldError id="settings-defaultLocale-error" message={settingsErrors.defaultLocale} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <ImagePickerField
                    id="settings-logoUrl"
                    label="Header Logo"
                    value={settings.logoUrl}
                    onChange={(url) => setSettings({ ...settings, logoUrl: url })}
                    error={settingsErrors.logoUrl}
                    placeholder="Choose Header Logo"
                    helperText="Logo used in header navigation & footer (leave empty for built-in EcoMate mark)."
                    modalTitle="Select Header Logo"
                  />

                  <ImagePickerField
                    id="settings-faviconUrl"
                    label="Favicon"
                    value={settings.faviconUrl}
                    onChange={(url) => setSettings({ ...settings, faviconUrl: url })}
                    error={settingsErrors.faviconUrl}
                    aspectRatio="square"
                    placeholder="Choose Favicon"
                    helperText="Browser tab icon (leave empty for default favicon)."
                    modalTitle="Select Favicon"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label htmlFor="settings-supportPhone" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Support Phone</label>
                    <input
                      id="settings-supportPhone"
                      type="text"
                      value={settings.supportPhone}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      aria-describedby={settingsErrors.supportPhone ? 'settings-supportPhone-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                    />
                    <FieldError id="settings-supportPhone-error" message={settingsErrors.supportPhone} />
                  </div>

                  <div>
                    <label htmlFor="settings-whatsappNumber" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">WhatsApp Number (e.g. 8801894828290)</label>
                    <input
                      id="settings-whatsappNumber"
                      type="text"
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      aria-describedby={settingsErrors.whatsappNumber ? 'settings-whatsappNumber-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                    />
                    <FieldError id="settings-whatsappNumber-error" message={settingsErrors.whatsappNumber} />
                  </div>
                </div>

                <div className="text-xs">
                  <label htmlFor="settings-address" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Corporate Physical Address</label>
                  <input
                    id="settings-address"
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    aria-describedby={settingsErrors.address ? 'settings-address-error' : undefined}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <FieldError id="settings-address-error" message={settingsErrors.address} />
                </div>

                <div className="text-xs">
                  <label htmlFor="settings-seoTitle" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Global SEO Title</label>
                  <input
                    id="settings-seoTitle"
                    type="text"
                    value={settings.seoTitle}
                    onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })}
                    aria-describedby={settingsErrors.seoTitle ? 'settings-seoTitle-error' : undefined}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                  <FieldError id="settings-seoTitle-error" message={settingsErrors.seoTitle} />
                </div>

                <div className="text-xs">
                  <label htmlFor="settings-seoDescription" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Global Meta Description</label>
                  <textarea
                    id="settings-seoDescription"
                    rows={2}
                    value={settings.seoDescription}
                    onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })}
                    aria-describedby={settingsErrors.seoDescription ? 'settings-seoDescription-error' : undefined}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
                  />
                    <FieldError id="settings-seoDescription-error" message={settingsErrors.seoDescription} />
                  </div>

                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 space-y-2">
                  <label htmlFor="settings-seoIndexing" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <input
                      id="settings-seoIndexing"
                      type="checkbox"
                      checked={settings?.seoIndexingEnabled ?? false}
                      onChange={(e) => settings && setSettings({ ...settings, seoIndexingEnabled: e.target.checked })}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span>Search engine indexing</span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    OFF থাকলে Google কোনো পেজ index করবে না (robots + sitemap + meta + header সব বন্ধ)।
                    ON করলে পুরো সাইট index শুরু হবে। Save চাপলে কার্যকর হবে।
                  </p>
                </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Meta Conversions API mode (H-1)</h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 mb-3">
                      Instant sends the full Lead event on submit. Validated sends a lightweight instant event on submit and the full Lead only when a lead reaches the trigger status. Applies to consented visitors only.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label htmlFor="settings-metaCapiMode" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">CAPI mode</label>
                        <select
                          id="settings-metaCapiMode"
                          value={settings.metaCapiMode ?? 'instant'}
                          onChange={(e) => setSettings({ ...settings, metaCapiMode: e.target.value as SiteSettings['metaCapiMode'] })}
                          aria-describedby={settingsErrors.metaCapiMode ? 'settings-metaCapiMode-error' : undefined}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        >
                          <option value="instant">Instant — full Lead on submit</option>
                          <option value="validated">Validated — full Lead on trigger status</option>
                        </select>
                        <FieldError id="settings-metaCapiMode-error" message={settingsErrors.metaCapiMode} />
                      </div>
                      <div>
                        <label htmlFor="settings-metaLeadStatusTrigger" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Trigger status (validated mode)</label>
                        <select
                          id="settings-metaLeadStatusTrigger"
                          value={settings.metaLeadStatusTrigger ?? ''}
                          onChange={(e) => setSettings({ ...settings, metaLeadStatusTrigger: e.target.value })}
                          aria-describedby={settingsErrors.metaLeadStatusTrigger ? 'settings-metaLeadStatusTrigger-error' : undefined}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        >
                          <option value="">Not configured (instant events only)</option>
                          {(['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost'] as const).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <FieldError id="settings-metaLeadStatusTrigger-error" message={settingsErrors.metaLeadStatusTrigger} />
                      </div>
                      <div>
                        <label htmlFor="settings-metaInstantEventName" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Instant event name</label>
                        <input
                          id="settings-metaInstantEventName"
                          type="text"
                          value={settings.metaInstantEventName ?? 'LeadInitiated'}
                          onChange={(e) => setSettings({ ...settings, metaInstantEventName: e.target.value })}
                          aria-describedby={settingsErrors.metaInstantEventName ? 'settings-metaInstantEventName-error' : undefined}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                        />
                        <FieldError id="settings-metaInstantEventName-error" message={settingsErrors.metaInstantEventName} />
                      </div>
                    </div>
                  </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Site Settings</span>
                  </button>
                </div>
              </form>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-3 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cache</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Purge করলে সব cached content expire হবে — পরের ভিজিটে fresh DB read হবে।
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={purging !== null}
                    onClick={() => setConfirmScope('all')}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  >
                    {purging === 'all' ? 'Purging…' : 'Purge all cache'}
                  </button>
                  <button
                    type="button"
                    title="শুধু landing shell (content, menus, branding, pricing)"
                    disabled={purging !== null}
                    onClick={() => setConfirmScope('landing')}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{purging === 'landing' ? 'Purging…' : 'Landing only'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          activities={leadActivities}
          isLoadingTimeline={isLoadingTimeline}
          operators={operators}
          followUpDraft={followUpDraft}
          onFollowUpDraftChange={setFollowUpDraft}
          onClose={() => setSelectedLead(null)}
          onStatusChange={(id, status) => void handleUpdateLeadStatus(id, status)}
          onAssign={(leadId, assignedToId) => void handleAssignLead(leadId, assignedToId)}
          onSaveFollowUp={(lead) => void handleSaveFollowUp(lead)}
          onRetryCapi={(id) => void handleRetryMetaSync(id)}
          onRetryPortal={(id) => void handleRetryLicenseSync(id)}
          onNotify={showNotification}
        />
      )}

      <ConfirmDialog
        open={confirmScope !== null}
        title={confirmScope === 'all' ? 'Purge all caches?' : 'Purge public cache?'}
        body={
          confirmScope === 'all'
            ? 'Clears cached data everywhere, so every screen and page loads fresh.'
            : 'Clears the public website cache only.'
        }
        confirmLabel={confirmScope === 'all' ? 'Purge all caches' : 'Purge public cache'}
        pending={purging !== null}
        onConfirm={() => {
          if (confirmScope) void runPurge(confirmScope);
        }}
        onClose={() => setConfirmScope(null)}
      />

      {/* Toast (artifact `.toast`): bottom-right status card. `showNotification`
          is unchanged — only this container moved out of the header. */}
      {saveMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[70] flex max-w-[380px] items-center gap-3 rounded-lg border border-[#e4e7ec] bg-white px-3.5 py-3 shadow-xl dark:border-[#2a2a3a] dark:bg-[#14141c]"
        >
          <CheckCircle2 className="h-[18px] w-[18px] flex-none text-emerald-600 dark:text-emerald-400" />
          <p className="m-0 flex-1 text-[13.5px] font-medium text-[#14171c] dark:text-[#ededf3]">
            {saveMessage}
          </p>
          <button
            type="button"
            onClick={() => setSaveMessage(null)}
            aria-label="Dismiss notification"
            className="inline-flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#f1f3f5] dark:text-[#8e8ea4] dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * `Date` → the `yyyy-mm-dd` a `<input type="date">` expects, in the browser's own timezone.
 *
 * `toISOString()` is deliberately avoided: it converts to UTC first, so a follow-up set for
 * 2026-01-01 in Dhaka (UTC+6) would render in the picker as 2025-12-31.
 */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
