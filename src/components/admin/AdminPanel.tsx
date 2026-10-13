import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
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
import { MediaLibrary } from './MediaLibrary';
import { DashboardTab } from './tabs/DashboardTab';
import { LeadsTab } from './tabs/LeadsTab';
import { SectionsTab } from './tabs/SectionsTab';
import { ContentTab } from './tabs/ContentTab';
import { PricingTab } from './tabs/PricingTab';
import { TestimonialsTab } from './tabs/TestimonialsTab';
import { BlogTab } from './tabs/BlogTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { LeadDrawer } from './tabs/LeadDrawer';
import { ConfirmDialog, Card, CardHeader } from './ui';
import { AdminShell, type AdminNavItem } from './AdminShell';
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
  CheckCircle2,
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
   * Tab switch shared by the shell sidebar and every in-panel shortcut.
   * Leaving the blog list/editor always exits edit mode so a returning
   * operator lands on the list, never a stale draft.
   */
  const handleTab = (tab: AdminTab): void => {
    setActiveTab(tab);
    setIsEditingBlog(false);
  };

  /**
   * Shell navigation groups — ids/labels/icons/counts copied verbatim from the
   * retired sidebar so badges behave exactly as before: New-lead count in rose,
   * translation-gap count in amber, no badge anywhere else. (The old Editorial
   * group carried a `count` on the blog entry that its renderer ignored, so the
   * shell item omits it to preserve the rendered output.)
   */
  const NAV_GROUPS: { group: string; items: AdminNavItem[] }[] = [
    {
      group: 'Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
        {
          id: 'leads',
          label: 'Lead CRM',
          icon: Users,
          count: leads.filter((l) => l.status === 'New').length,
          tone: 'rose',
        },
      ],
    },
    {
      group: 'Editorial & Media',
      items: [
        { id: 'blog', label: 'Blog & Articles', icon: BookOpen },
        { id: 'media', label: 'Media Library', icon: Image },
      ],
    },
    {
      group: 'Marketing CMS',
      items: [
        { id: 'sections', label: 'Landing Sections', icon: FileText },
        {
          id: 'content',
          label: 'Bilingual Strings',
          icon: Languages,
          count: i18nReport?.gapCount ?? 0,
          tone: 'amber',
        },
        { id: 'pricing', label: 'Dynamic Pricing', icon: DollarSign },
        { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      ],
    },
    {
      group: 'System',
      items: [
        { id: 'integrations', label: 'License Portal Queue', icon: Share2 },
        { id: 'settings', label: 'System & Branding', icon: Settings },
      ],
    },
  ];

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((item) => item.id === activeTab)?.label ??
    'Dashboard Overview';

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <AdminShell
        nav={NAV_GROUPS}
        activeTab={activeTab}
        onTab={handleTab}
        breadcrumb={activeLabel}
        health={{
          sql: loadError ? 'down' : 'ok',
          license: systemHealth?.licensePortalConfigured ? 'connected' : 'standby',
        }}
        // AdminPanel receives no session/email prop (verified: no useSession or
        // operator email anywhere in this file) — the shell shows a generic
        // operator identity until session wiring lands. Sign-out still ends the
        // real next-auth session (flow copied from AdminConsole).
        user={{ name: 'Admin User', email: '', role: 'Platform Admin' }}
        logoUrl={settings?.logoUrl ?? ''}
        siteName={settings?.siteName || 'EcoMate'}
        purging={purging}
        onPurge={(scope) => setConfirmScope(scope)}
        onSignOut={() => {
          void signOut({ callbackUrl: '/admin/login' });
        }}
        onBackToSite={onClose}
      >
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
              onOpenLeads={() => handleTab('leads')}
              onOpenContent={() => handleTab('content')}
              onOpenLead={handleOpenLead}
              onStatusChange={handleUpdateLeadStatus}
              onAddSection={() => handleTab('sections')}
              onWriteArticle={() => handleTab('blog')}
              onUploadMedia={() => handleTab('media')}
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
            <SectionsTab sections={sections} onSectionsChange={setSections} onNotify={showNotification} />
          )}

          {/* TAB 4: BILINGUAL CONTENT EDITOR (EN | BN side by side) */}
          {activeTab === 'content' && (
            <ContentTab
              i18nReport={i18nReport}
              editingSectionKey={editingSectionKey}
              onEditingSectionKeyChange={setEditingSectionKey}
              editorRows={editorRows}
              onEditorRowsChange={setEditorRows}
              editorDraft={editorDraft}
              onEditorDraftChange={setEditorDraft}
              editorErrors={editorErrors}
              editorConflict={editorConflict}
              onEditorConflictChange={setEditorConflict}
              revisionHistory={revisionHistory}
              isLoadingHistory={isLoadingHistory}
              isSavingEditor={isSavingEditor}
              onOpenSection={(key) => void handleOpenSection(key)}
              onSaveLocale={(locale) => void handleSaveLocale(locale)}
              onPublishLocale={(locale) => void handlePublishLocale(locale)}
              onLoadHistory={(locale) => void handleLoadHistory(locale)}
              onRestoreRevision={(locale, version) => void handleRestoreRevision(locale, version)}
              diffKeysOf={conflictDiffKeys}
            />
          )}

          {/* TAB 4: PRICING CMS */}
          {activeTab === 'pricing' && (
            <PricingTab pricing={pricing} onTogglePricingMode={handleTogglePricingMode} />
          )}

          {/* TAB 5: TESTIMONIALS & CASE STUDIES */}
          {activeTab === 'testimonials' && (
            <TestimonialsTab
              testimonials={testimonials}
              caseStudies={caseStudies}
              testimonialDraft={testimonialDraft}
              onTestimonialDraftChange={setTestimonialDraft}
              testimonialErrors={testimonialErrors}
              onTestimonialErrorsChange={setTestimonialErrors}
              testimonialSaving={testimonialSaving}
              caseStudyDraft={caseStudyDraft}
              onCaseStudyDraftChange={setCaseStudyDraft}
              caseStudyErrors={caseStudyErrors}
              onCaseStudyErrorsChange={setCaseStudyErrors}
              caseStudySaving={caseStudySaving}
              onSaveTestimonial={handleSaveTestimonial}
              onDeleteTestimonial={handleDeleteTestimonial}
              onSaveCaseStudy={handleSaveCaseStudy}
              onDeleteCaseStudy={handleDeleteCaseStudy}
            />
          )}

          {/* TAB 6: BLOG & SEO PLATFORM */}
          {activeTab === 'blog' && (
            <BlogTab
              blogPosts={blogPosts}
              editingPost={editingPost}
              onEditingPostChange={setEditingPost}
              blogErrors={blogErrors}
              onBlogErrorsChange={setBlogErrors}
              isEditingBlog={isEditingBlog}
              onIsEditingBlogChange={setIsEditingBlog}
              isBlogSaving={isBlogSaving}
              blogSubTab={blogSubTab}
              onBlogSubTabChange={setBlogSubTab}
              blogSearchQuery={blogSearchQuery}
              onBlogSearchQueryChange={setBlogSearchQuery}
              blogStatusFilter={blogStatusFilter}
              onBlogStatusFilterChange={setBlogStatusFilter}
              onSaveBlogPost={handleSaveBlogPost}
              onDeleteBlogPost={handleDeleteBlogPost}
            />
          )}

          {/* TAB 7: MEDIA SLOTS */}
          {activeTab === 'media' && (
            <Card>
              <CardHeader title="Media Library" />
              <div className="p-5">
                <MediaLibrary />
              </div>
            </Card>
          )}

          {/* TAB 8: LICENSE PORTAL INTEGRATION QUEUE */}
          {activeTab === 'integrations' && <IntegrationsTab integrationLogs={integrationLogs} />}

          {/* TAB 9: SETTINGS & BRANDING */}
          {activeTab === 'settings' && settings && (
            <SettingsTab
              settings={settings}
              onSettingsChange={setSettings}
              settingsErrors={settingsErrors}
              purging={purging}
              onConfirmScopeChange={setConfirmScope}
              onSaveSettings={handleSaveSettings}
            />
          )}
      </AdminShell>

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
