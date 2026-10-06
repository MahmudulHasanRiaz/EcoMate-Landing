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
import { fieldErrorsOf, type FieldErrors } from './fieldErrors';
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
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Save,
  Eye,
  EyeOff,
  Server,
  X,
  Phone,
  Mail,
  Calendar,
  Languages,
  Download,
  History,
  UserPlus,
  Clock,
} from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  locale: 'en' | 'bn';
  theme: 'light' | 'dark';
}

type AdminTab =
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

/** Inline validation message rendered against its input (Task 17 §5). */
const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-400">
      {message}
    </p>
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, locale, theme }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Loaded Entities
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [pricing, setPricing] = useState<{ isPricingVisible: boolean; plans: PricingPlan[] }>({ isPricingVisible: true, plans: [] });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ status: string; uptime: number; postgresConfigured: boolean; licensePortalConfigured: boolean } | null>(null);

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
    status: 'published',
    readTime: '5 min read',
    tags: ['ecommerce', 'operations'],
  });

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        sData,
        secData,
        pData,
        lData,
        tData,
        csData,
        bData,
        mData,
        iData,
        hData,
      ] = await Promise.all([
        api.getSettings(),
        api.getSections(),
        api.getPricing(),
        // Every list endpoint is paginated (Task 16). The admin asks for the maximum page in
        // one shot rather than rendering a pager: an operator triaging leads needs the whole
        // working set on screen, and `MAX_LIMIT` (100) is the ceiling the server enforces anyway.
        api.getLeads({ limit: api.ADMIN_LIST_LIMIT }),
        api.getTestimonials({ limit: api.ADMIN_LIST_LIMIT }),
        api.getCaseStudies({ limit: api.ADMIN_LIST_LIMIT }),
        api.getBlogPosts({ limit: api.ADMIN_LIST_LIMIT }),
        api.getMediaAssets({ limit: api.ADMIN_LIST_LIMIT }),
        api.getIntegrationLogs({ limit: api.ADMIN_LIST_LIMIT }),
        api.getSystemHealth(),
      ]);

      setSettings(sData);
      setSections(secData);
      setPricing(pData);
      setLeads(lData);
      setTestimonials(tData);
      setCaseStudies(csData);
      setBlogPosts(bData);
      setMediaAssets(mData);
      setIntegrationLogs(iData);
      setSystemHealth(hData);
      // Translation gaps are a dashboard-level signal, and the endpoint is superadmin/admin
      // only — so it is fetched on its own and a 403 leaves the badge at zero rather than
      // taking down the whole `Promise.all` (which would blank every panel for an editor).
      api
        .getI18nReport()
        .then(setI18nReport)
        .catch(() => setI18nReport(null));
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
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

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlogErrors({});
    try {
      if (editingPost.id) {
        await api.updateBlogPost(editingPost.id, editingPost);
        showNotification('Article updated successfully');
      } else {
        await api.createBlogPost(editingPost);
        showNotification('New article published successfully');
      }
      setIsEditingBlog(false);
      const bData = await api.getBlogPosts({ limit: api.ADMIN_LIST_LIMIT });
      setBlogPosts(bData);
    } catch (err: unknown) {
      setBlogErrors(fieldErrorsOf(err));
      showNotification(`Error saving post: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const matchesStatus = leadStatusFilter === 'All' || l.status === leadStatusFilter;
    const matchesSearch =
      l.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.phone.includes(leadSearchQuery) ||
      l.email.toLowerCase().includes(leadSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  /**
   * The lead drawer: timeline, assignment, follow-up (Task 16 §1).
   *
   * A fixed overlay rather than an inline row expansion, because the timeline is a scrollable
   * column of its own and expanding a table row to hold it breaks the row height for every
   * other row in the table.
   */
  const renderLeadDrawer = () => {
    if (!selectedLead) return null;
    const lead = selectedLead;
    const isOverdue =
      lead.followUpAt !== null &&
      lead.followUpAt !== undefined &&
      new Date(lead.followUpAt).getTime() < Date.now() &&
      lead.status !== 'Won' &&
      lead.status !== 'Lost';

    return (
      <div
        className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={`Lead ${lead.name} — timeline and follow-up`}
        onClick={(e) => {
          // Click-outside to close, but not a click that started inside the panel: a text
          // selection inside the timeline must not dismiss it.
          if (e.target === e.currentTarget) setSelectedLead(null);
        }}
      >
        <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0D18]">
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#0B0D18]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                <History className="h-3.5 w-3.5" />
                Lead #{lead.id}
              </p>
              <h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{lead.name}</h3>
              <p className="truncate font-mono text-xs text-slate-600 dark:text-slate-400">
                {lead.phone}
                {lead.email ? ` · ${lead.email}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              aria-label="Close lead panel"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Anonymised by the retention cron: the timeline is history, but the contact
              details below it are gone and re-entering them would undo a compliance action. */}
          {lead.anonymizedAt && (
            <p className="mx-5 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Personal data on this lead was anonymised on{' '}
              {new Date(lead.anonymizedAt).toLocaleDateString()} under the retention policy.
              Status history is preserved.
            </p>
          )}

          <div className="space-y-6 px-5 py-5">
            {/* Assignment */}
            <section>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <UserPlus className="h-3.5 w-3.5" />
                Assignment
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={lead.assignedToId ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    void handleAssignLead(lead.id, raw === '' ? null : Number(raw));
                  }}
                  aria-label="Assign this lead to an operator"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-black/40 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.email}
                    </option>
                  ))}
                </select>
                {/* The legacy free-text column, shown because it is what the rest of the
                    pipeline has historically displayed and it is not written by this task. */}
                {lead.assignedTo && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {lead.assignedTo}
                  </span>
                )}
              </div>
            </section>

            {/* Follow-up */}
            <section>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Follow-up
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  value={followUpDraft}
                  onChange={(e) => setFollowUpDraft(e.target.value)}
                  aria-label="Scheduled follow-up date"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-black/40 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveFollowUp(lead)}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
              {isOverdue && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                  Overdue — the promised follow-up date has passed.
                </p>
              )}
            </section>

            {/* Timeline, newest first */}
            <section>
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                <History className="h-3.5 w-3.5" />
                Timeline
              </h4>

              {isLoadingTimeline ? (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Loading history…</p>
              ) : leadActivities.length === 0 ? (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  No recorded activity yet. Every status change and assignment from here on is
                  logged with the operator who made it.
                </p>
              ) : (
                <ol className="mt-3 space-y-0 border-l border-slate-200 pl-4 dark:border-white/10">
                  {leadActivities.map((activity) => (
                    <li key={activity.id} className="relative pb-4 last:pb-0">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-[#0B0D18]"
                      />
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {activity.fromStatus && activity.toStatus && activity.fromStatus !== activity.toStatus
                          ? `${activity.fromStatus} → ${activity.toStatus}`
                          : activity.toStatus || 'Activity'}
                      </p>
                      {activity.note && (
                        <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {activity.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(activity.createdAt).toLocaleString()}
                        {/* A null actor is either system-initiated (lead captured) or an operator
                            who has since been deleted — both are worth distinguishing from
                            "an operator did this" rather than leaving the field blank. */}
                        {activity.actorId === null ? ' · system' : ` · operator #${activity.actorId}`}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  };

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
            <p className="text-xs text-slate-600 dark:text-slate-400">Authoritative PostgreSQL & Content Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveMessage && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{saveMessage}</span>
            </div>
          )}

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

      {/* Main Admin Layout: Sidebar + Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-56 sm:w-64 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#090B14] p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'leads', label: 'Lead Management', icon: Users, count: leads.filter((l) => l.status === 'New').length },
              { id: 'sections', label: 'Landing Sections CMS', icon: FileText },
              {
                id: 'content',
                label: 'Bilingual Content',
                icon: Languages,
                // The translation-gap badge. `count > 0` is what makes the pill render, so a
                // fully-translated site shows none and an editor's 403 shows none.
                count: i18nReport?.gapCount ?? 0,
              },
              { id: 'pricing', label: 'Dynamic Pricing', icon: DollarSign },
              { id: 'testimonials', label: 'Testimonials & Proof', icon: MessageSquareQuote },
              { id: 'blog', label: 'Blog & SEO Articles', icon: BookOpen },
              { id: 'media', label: 'Media Library Slots', icon: Image },
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
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
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Operations & Marketing Hub</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Real-time visibility into inbound enterprise leads, CMS content status, and external integration dispatches.
                </p>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Inbound Leads</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {leads.length}
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 font-medium">
                    {leads.filter((l) => l.status === 'New').length} pending follow-up
                  </p>
                  {/* Overdue worklist (Task 16 §2). A clickable count rather than a separate
                      section: the operator's question on the dashboard is "what needs me today",
                      and this is the answer to it. */}
                  <button
                    onClick={() => setActiveTab('leads')}
                    className={`text-xs mt-1 font-semibold hover:underline cursor-pointer ${
                      overdueLeads.length > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {overdueLeads.length} overdue follow-up{overdueLeads.length === 1 ? '' : 's'}
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pricing Mode Active</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {pricing.isPricingVisible ? 'Tiered Visible' : 'Custom / Hidden'}
                  </p>
                  <button
                    onClick={handleTogglePricingMode}
                    className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer"
                  >
                    Switch mode →
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">CMS Landing Sections</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {sections.length}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                    Fully database-configured
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Untranslated Sections (BN)</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {i18nReport ? i18nReport.gapCount : '—'}
                  </p>
                  <button
                    onClick={() => setActiveTab('content')}
                    className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer"
                  >
                    {i18nReport && i18nReport.gapCount === 0
                      ? 'Every section has Bangla copy'
                      : 'Bangla falls back to English until translated'}
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Blog / SEO Content</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {blogPosts.length}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    Indexable problem-first articles
                  </p>
                </div>
              </div>

              {/* Recent Leads Preview */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Inbound Consultation Leads</h3>
                  <button
                    onClick={() => setActiveTab('leads')}
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all leads</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {leads.slice(0, 4).map((lead) => (
                    <div key={lead.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenLead(lead)}
                        className="min-w-0 text-left"
                        title="Open the full timeline"
                      >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{lead.name}</span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">{lead.phone}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {lead.dailyVolume}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">
                          {lead.note || 'No specific note provided.'}
                        </p>
                      </div>
                      </button>

                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                          className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Demo Scheduled">Demo Scheduled</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEAD MANAGEMENT */}
          {activeTab === 'leads' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Inbound Lead Pipeline</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Authoritative PostgreSQL records from public demo booking forms. Syncable to License Portal.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, email..."
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>

                  {/* CSV export (Task 16 §2). A plain link rather than a fetch-then-blob: the
                      browser handles the download, the Content-Disposition filename comes from
                      the server, and the session cookie rides along without any token handling. */}
                  <a
                    href={api.leadExportUrl()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                    title="Download every lead as CSV (audited; capped at 10,000 rows)"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </a>
                </div>
              </div>

              {/* Overdue follow-up worklist (Task 16 §2). Rendered above the table because a
                  missed promise to a customer is the most time-sensitive thing on this screen. */}
              {overdueLeads.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-rose-900 dark:text-rose-200">
                    <Clock className="h-4 w-4" />
                    Overdue follow-ups ({overdueLeads.length})
                  </h3>
                  <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300/80">
                    Promised callback dates that have passed on leads that are still open.
                  </p>
                  <ul className="mt-3 divide-y divide-rose-200/60 text-xs dark:divide-rose-500/20">
                    {overdueLeads.map((overdue) => (
                      <li key={overdue.id} className="flex items-center justify-between gap-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            const match = leads.find((l) => l.id === overdue.id);
                            if (match) void handleOpenLead(match);
                            else
                              showNotification(
                                `Lead #${overdue.id} is outside the loaded page — narrow the filters or use the CSV export.`,
                              );
                          }}
                          className="min-w-0 text-left font-semibold text-slate-900 hover:underline dark:text-white"
                        >
                          <span className="block truncate">{overdue.name}</span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{overdue.phone}</span>
                        </button>
                        <span className="shrink-0 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                          due {overdue.followUpAt ? new Date(overdue.followUpAt).toLocaleDateString() : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Leads Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Lead / Company</th>
                        <th className="px-4 py-3">Phone & Email</th>
                        <th className="px-4 py-3">Order Volume</th>
                        <th className="px-4 py-3">Stage Status</th>
                        <th className="px-4 py-3">License Sync</th>
                        <th className="px-4 py-3">Meta CAPI</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 dark:text-white block">{lead.name}</span>
                            <span className="text-[11px] text-slate-600 font-mono dark:text-slate-300">
                              {new Date(lead.createdAt).toLocaleDateString()} · {lead.source}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block">{lead.phone}</span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300">{lead.email || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {lead.dailyVolume}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={lead.status}
                              onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                              className="px-2 py-1 rounded bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 font-medium text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Demo Scheduled">Demo Scheduled</option>
                              <option value="Won">Won</option>
                              <option value="Lost">Lost</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                lead.licensePortalStatus === 'Synced'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : lead.licensePortalStatus === 'Failed'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                              }`}
                            >
                              {lead.licensePortalStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                lead.metaCapiStatus === 'Sent'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : lead.metaCapiStatus === 'Failed'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                  : lead.metaCapiStatus === 'Skipped'
                                  ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                              }`}
                              title={lead.metaCapiError || 'Server-side Meta Conversions API (Lead event)'}
                            >
                              {lead.metaCapiStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRetryMetaSync(lead.id)}
                                className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Re-send the server-side Meta Lead event (skips leads already Sent)"
                              >
                                Retry CAPI
                              </button>
                              <button
                                onClick={() => handleRetryLicenseSync(lead.id)}
                                className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Dispatch to external License Portal queue"
                              >
                                Sync Portal
                              </button>
                              {/* Opens the drawer: timeline, assignment, follow-up. */}
                              <button
                                onClick={() => handleOpenLead(lead)}
                                className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Open the full timeline, assignment and follow-up"
                              >
                                <History className="h-3 w-3" />
                                <span className="sr-only">Timeline for lead {lead.id}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECTIONS CMS */}
          {activeTab === 'sections' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Landing Page Sections CMS</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Control section headlines, subtitles, language translations, ordering and live visibility without code changes.
                </p>
              </div>

              <div className="space-y-4">
                {sections.map((sec) => (
                  <div key={sec.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
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
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
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
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    {i18nReport
                      ? `${i18nReport.translatedSectionCount}/${i18nReport.englishSectionCount} sections translated`
                      : 'Report unavailable for this role'}
                  </span>
                </div>

                {!i18nReport ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Loading translation report…
                  </p>
                ) : i18nReport.gaps.length === 0 ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
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
                  <p className="mt-3 text-[11px] text-rose-700 dark:text-rose-400">
                    Bangla rows with no English source (check the section key):{' '}
                    <span className="font-mono">{i18nReport.orphans.join(', ')}</span>
                  </p>
                )}
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
                            <p className="mt-2 text-[11px] font-medium text-rose-700 dark:text-rose-400">
                              {error}
                            </p>
                          )}
                          {!row && !error && (
                            <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                              No {locale.toUpperCase()} row yet. Saving creates it.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
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
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
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
                <p className="text-xs text-slate-600 dark:text-slate-400">
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
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
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
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{plan.tierSubtitleEn}</p>

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
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Proof & Case Studies CMS</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Manage verifiable client testimonials, video interviews, and quantified ROI case studies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{t.companyName}</span>
                        <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">{t.videoDuration}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t.clientName} · {t.clientRole}</p>
                      <blockquote className="mt-3 text-xs text-slate-700 dark:text-slate-300 italic">
                        "{t.quoteEn}"
                      </blockquote>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t.metrics[0]?.stat} {t.metrics[0]?.label}</span>
                      <span className="font-mono text-[11px]">{t.websiteUrl}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: BLOG & SEO PLATFORM */}
          {activeTab === 'blog' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Authoritative Blog & SEO Platform</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Publish high-intent problem-solving guides for search engines and AI research bots.
                  </p>
                </div>

                {!isEditingBlog && (
                  <button
                    onClick={() => {
                      setEditingPost({
                        title: '',
                        slug: '',
                        excerpt: '',
                        content: '',
                        category: 'Logistics & Economics',
                        author: 'EcoMate Operations Research',
                        status: 'published',
                        readTime: '5 min read',
                        tags: ['courier', 'ecommerce', 'bangladesh'],
                      });
                      setBlogErrors({});
                      setIsEditingBlog(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Write Article</span>
                  </button>
                )}
              </div>

              {isEditingBlog ? (
                <form onSubmit={handleSaveBlogPost} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingPost.id ? 'Edit Article' : 'Create New Problem-Solving Article'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingBlog(false)}
                      className="text-xs text-slate-600 hover:text-slate-900 dark:hover:text-white dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label htmlFor="blog-title" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Article Title</label>
                      <input
                        id="blog-title"
                        type="text"
                        required
                        value={editingPost.title}
                        onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                        aria-describedby={blogErrors.title ? 'blog-title-error' : undefined}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                      <FieldError id="blog-title-error" message={blogErrors.title} />
                    </div>
                    <div>
                      <label htmlFor="blog-slug" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">URL Slug</label>
                      <input
                        id="blog-slug"
                        type="text"
                        required
                        value={editingPost.slug}
                        onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                        aria-describedby={blogErrors.slug ? 'blog-slug-error' : undefined}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                      />
                      <FieldError id="blog-slug-error" message={blogErrors.slug} />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label htmlFor="blog-excerpt" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Excerpt (Meta Description)</label>
                    <textarea
                      id="blog-excerpt"
                      rows={2}
                      required
                      value={editingPost.excerpt}
                      onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                      aria-describedby={blogErrors.excerpt ? 'blog-excerpt-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
                    />
                    <FieldError id="blog-excerpt-error" message={blogErrors.excerpt} />
                  </div>

                  <div className="text-xs">
                    <label htmlFor="blog-content" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Markdown Body Content</label>
                    <textarea
                      id="blog-content"
                      rows={8}
                      required
                      value={editingPost.content}
                      onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                      aria-describedby={blogErrors.content ? 'blog-content-error' : undefined}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                    />
                    <FieldError id="blog-content-error" message={blogErrors.content} />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Publish Article to CMS
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {post.category}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">/blog/{post.slug}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">{post.title}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{post.excerpt}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setBlogErrors({});
                            setIsEditingBlog(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: MEDIA SLOTS */}
          {activeTab === 'media' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Media Asset Slots</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Clean media architecture abstraction. Replaceable placeholders ready for final graphic production.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                    <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 uppercase font-bold">{asset.category}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{asset.title}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-2 truncate bg-slate-50 dark:bg-black/30 p-2 rounded-lg border border-slate-200/60 dark:border-white/5">
                      {asset.url}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-2 dark:text-slate-300">Key: {asset.key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: LICENSE PORTAL INTEGRATION QUEUE */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">External License Portal Integration Layer</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
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
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                        {new Date(log.createdAt).toLocaleString()} · Attempts: {log.attempts}
                      </p>
                      {log.errorMessage && (
                        <p className="text-rose-700 dark:text-rose-400 text-[11px]">{log.errorMessage}</p>
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
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
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
            </div>
          )}
        </main>
      </div>

      {renderLeadDrawer()}
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
