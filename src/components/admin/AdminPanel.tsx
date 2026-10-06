import React, { useState, useEffect } from 'react';
import type {
  SiteSettings,
  LandingSection,
  PricingPlan,
  Lead,
  Testimonial,
  CaseStudy,
  BlogPost,
  MediaAsset,
  IntegrationLog,
} from '../../types/api';
import * as api from '../../services/api';
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
  | 'pricing'
  | 'testimonials'
  | 'blog'
  | 'media'
  | 'settings'
  | 'integrations';

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

  // Filters & Selected States
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('All');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Blog Editor State
  const [isEditingBlog, setIsEditingBlog] = useState(false);
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
        api.getLeads(),
        api.getTestimonials(),
        api.getCaseStudies(),
        api.getBlogPosts(),
        api.getMediaAssets(),
        api.getIntegrationLogs(),
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
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  // Handlers
  const handleUpdateLeadStatus = async (id: number, status: Lead['status']) => {
    try {
      const updated = await api.updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      showNotification(`Lead #${id} status updated to ${status}`);
    } catch (err: any) {
      showNotification(`Error updating lead: ${err.message}`);
    }
  };

  const handleRetryLicenseSync = async (id: number) => {
    try {
      const result = await api.retryLeadLicenseSync(id);
      showNotification(result.message || `Dispatched lead #${id} to License Portal integration queue`);
      const updatedLeads = await api.getLeads();
      setLeads(updatedLeads);
      const updatedLogs = await api.getIntegrationLogs();
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
      const updatedLeads = await api.getLeads();
      setLeads(updatedLeads);
      const updatedLogs = await api.getIntegrationLogs();
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
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      showNotification('Site settings updated successfully');
    } catch (err: any) {
      showNotification(`Error saving settings: ${err.message}`);
    }
  };

  const handleSaveBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPost.id) {
        await api.updateBlogPost(editingPost.id, editingPost);
        showNotification('Article updated successfully');
      } else {
        await api.createBlogPost(editingPost);
        showNotification('New article published successfully');
      }
      setIsEditingBlog(false);
      const bData = await api.getBlogPosts();
      setBlogPosts(bData);
    } catch (err: any) {
      showNotification(`Error saving post: ${err.message}`);
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Authoritative PostgreSQL & Content Engine</p>
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
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Real-time visibility into inbound enterprise leads, CMS content status, and external integration dispatches.
                </p>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Inbound Leads</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {leads.length}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                    {leads.filter((l) => l.status === 'New').length} pending follow-up
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pricing Mode Active</span>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {pricing.isPricingVisible ? 'Tiered Visible' : 'Custom / Hidden'}
                  </p>
                  <button
                    onClick={handleTogglePricingMode}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer"
                  >
                    Switch mode →
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">CMS Landing Sections</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {sections.length}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    Fully database-configured
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Blog / SEO Content</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-numbers mt-2">
                    {blogPosts.length}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
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
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all leads</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {leads.slice(0, 4).map((lead) => (
                    <div key={lead.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{lead.name}</span>
                          <span className="font-mono text-slate-500">{lead.phone}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {lead.dailyVolume}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">
                          {lead.note || 'No specific note provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
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
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                </div>
              </div>

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
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(lead.createdAt).toLocaleDateString()} · {lead.source}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 block">{lead.phone}</span>
                            <span className="text-[11px] text-slate-500">{lead.email || 'N/A'}</span>
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Control section headlines, subtitles, language translations, ordering and live visibility without code changes.
                </p>
              </div>

              <div className="space-y-4">
                {sections.map((sec) => (
                  <div key={sec.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
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
                        <label className="block text-slate-500 mb-1 font-medium">English Headline</label>
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
                        <label className="block text-slate-500 mb-1 font-medium">Bangla Headline (বাংলা)</label>
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

          {/* TAB 4: PRICING CMS */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dynamic Pricing Manager</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                        <span className="text-xs font-normal text-slate-500">/ mo</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{plan.tierSubtitleEn}</p>

                      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-white/5 pt-3">
                        {plan.featuresEn.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage verifiable client testimonials, video interviews, and quantified ROI case studies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{t.companyName}</span>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">{t.videoDuration}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.clientName} · {t.clientRole}</p>
                      <blockquote className="mt-3 text-xs text-slate-700 dark:text-slate-300 italic">
                        "{t.quoteEn}"
                      </blockquote>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
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
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Article Title</label>
                      <input
                        type="text"
                        required
                        value={editingPost.title}
                        onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">URL Slug</label>
                      <input
                        type="text"
                        required
                        value={editingPost.slug}
                        onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Excerpt (Meta Description)</label>
                    <textarea
                      rows={2}
                      required
                      value={editingPost.excerpt}
                      onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="text-xs">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Markdown Body Content</label>
                    <textarea
                      rows={8}
                      required
                      value={editingPost.content}
                      onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                    />
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{post.excerpt}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPost(post);
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Clean media architecture abstraction. Replaceable placeholders ready for final graphic production.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs">
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold">{asset.category}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{asset.title}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-2 truncate bg-slate-50 dark:bg-black/30 p-2 rounded-lg border border-slate-200/60 dark:border-white/5">
                      {asset.url}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">Key: {asset.key}</p>
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                        {new Date(log.createdAt).toLocaleString()} · Attempts: {log.attempts}
                      </p>
                      {log.errorMessage && (
                        <p className="text-rose-600 dark:text-rose-400 text-[11px]">{log.errorMessage}</p>
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
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Global contact numbers, WhatsApp target, default locale, and meta parameters.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Brand Site Name</label>
                    <input
                      type="text"
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Default Locale</label>
                    <select
                      value={settings.defaultLocale}
                      onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="en">English (Default)</option>
                      <option value="bn">Bangla (বাংলা)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Support Phone</label>
                    <input
                      type="text"
                      value={settings.supportPhone}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">WhatsApp Number (e.g. 8801894828290)</label>
                    <input
                      type="text"
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Corporate Physical Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Global SEO Title</label>
                  <input
                    type="text"
                    value={settings.seoTitle}
                    onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Global Meta Description</label>
                  <textarea
                    rows={2}
                    value={settings.seoDescription}
                    onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white resize-none"
                  />
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
    </div>
  );
};
