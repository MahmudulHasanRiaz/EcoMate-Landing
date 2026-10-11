'use client';

/**
 * Admin Control Center.
 *
 * Production-grade hub providing operational metrics, direct module launchpads,
 * and operator/RBAC management in an ultra-minimalist, crisp aesthetic.
 */
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Users,
  Image as ImageIcon,
  DollarSign,
  Settings,
  Sparkles,
  ArrowUpRight,
  Database,
  Tag,
  FolderTree,
  Plus,
  RefreshCw,
  FileCheck2,
  Lock,
  Layers,
  Globe2,
} from 'lucide-react';
import type { AdminRole } from '@/lib/roles';
import { AdminUsersPanel } from './AdminUsersPanel';
import { TranslationGapBadge } from './TranslationGapBadge';

interface AdminConsoleProps {
  email: string;
  role: AdminRole;
  userId: string;
}

interface OverviewMetrics {
  postsTotal: number | null;
  leadsTotal: number | null;
  mediaTotal: number | null;
  categoriesTotal: number | null;
  tagsTotal: number | null;
}

export function AdminConsole({ email, role, userId }: AdminConsoleProps) {
  const [activeView, setActiveView] = useState<'overview' | 'operators'>('overview');
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    postsTotal: null,
    leadsTotal: null,
    mediaTotal: null,
    categoriesTotal: null,
    tagsTotal: null,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      setLoadingMetrics(true);
      try {
        const [postsRes, leadsRes, mediaRes, catRes, tagRes] = await Promise.allSettled([
          fetch('/api/blog?limit=1').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/leads?limit=1').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/media?limit=1').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/blog/categories').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/blog/tags').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (cancelled) return;

        setMetrics({
          postsTotal:
            postsRes.status === 'fulfilled' && postsRes.value?.total !== undefined
              ? postsRes.value.total
              : null,
          leadsTotal:
            leadsRes.status === 'fulfilled' && leadsRes.value?.total !== undefined
              ? leadsRes.value.total
              : null,
          mediaTotal:
            mediaRes.status === 'fulfilled' && mediaRes.value?.total !== undefined
              ? mediaRes.value.total
              : null,
          categoriesTotal:
            catRes.status === 'fulfilled' && Array.isArray(catRes.value?.data || catRes.value)
              ? (catRes.value.data || catRes.value).length
              : null,
          tagsTotal:
            tagRes.status === 'fulfilled' && Array.isArray(tagRes.value?.data || tagRes.value)
              ? (tagRes.value.data || tagRes.value).length
              : null,
        });
      } catch {
        // Non-blocking metrics failure
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    }

    void fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              EcoMate Admin Platform
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Control Center
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Authenticated as <span className="font-medium text-slate-700 dark:text-slate-200">{email || 'unknown'}</span>
            <span className="ml-2 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {role}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TranslationGapBadge role={role} />

          <Link
            href="/admin/cms"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
          >
            <LayoutDashboard className="h-4 w-4" />
            Launch CMS Studio
          </Link>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" />
            Live Site
          </Link>

          <button
            type="button"
            onClick={() => {
              void signOut({ callbackUrl: '/admin/login' });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mt-6 flex border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveView('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeView === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview & Launchpad
        </button>

        <button
          type="button"
          onClick={() => setActiveView('operators')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeView === 'operators'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Team & Access Control
        </button>
      </div>

      {activeView === 'overview' ? (
        <main className="mt-6 space-y-8">
          {/* Live KPI Metric Cards */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <Link
              href="/admin/cms?tab=blog"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 hover:shadow-sm dark:border-white/10 dark:bg-[#11131a]"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Blog Posts</span>
                <BookOpen className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loadingMetrics ? '—' : metrics.postsTotal ?? '0'}
                </span>
                <span className="text-[10px] text-slate-400">published</span>
              </div>
            </Link>

            <Link
              href="/admin/cms?tab=leads"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 hover:shadow-sm dark:border-white/10 dark:bg-[#11131a]"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Inquiries</span>
                <Users className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loadingMetrics ? '—' : metrics.leadsTotal ?? '0'}
                </span>
                <span className="text-[10px] text-slate-400">leads</span>
              </div>
            </Link>

            <Link
              href="/admin/cms?tab=media"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 hover:shadow-sm dark:border-white/10 dark:bg-[#11131a]"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">R2 Media</span>
                <ImageIcon className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loadingMetrics ? '—' : metrics.mediaTotal ?? '0'}
                </span>
                <span className="text-[10px] text-slate-400">assets</span>
              </div>
            </Link>

            <Link
              href="/admin/cms?tab=blog"
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 hover:shadow-sm dark:border-white/10 dark:bg-[#11131a]"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Taxonomy</span>
                <FolderTree className="h-4 w-4 text-sky-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loadingMetrics ? '—' : `${metrics.categoriesTotal ?? 0}`}
                </span>
                <span className="text-[10px] text-slate-400">cats / {metrics.tagsTotal ?? 0} tags</span>
              </div>
            </Link>

            <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#11131a]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Runtime</span>
                <Database className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Workers & Hyperdrive
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">Edge deployed</p>
            </div>
          </section>

          {/* Module Launchpads */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Management Modules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct access to content creation, lead pipeline, taxonomies, and site configuration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Blog Suite Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      2026 Ready
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Editorial & Blog Suite
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    WordPress-grade publishing with rich text & markdown, video players, nested category trees, tags, and 2026 AI Search / Google snippet previews.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=blog"
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    <Plus className="h-3 w-3" />
                    Write Article
                  </Link>
                  <Link
                    href="/admin/cms?tab=blog"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <FolderTree className="h-3 w-3" />
                    Categories
                  </Link>
                  <Link
                    href="/admin/cms?tab=blog"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <Tag className="h-3 w-3" />
                    Tags
                  </Link>
                </div>
              </div>

              {/* Leads & Pipeline Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Users className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Inbound CRM
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Leads & Inbound Inquiries
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Full lifecycle pipeline, status updates, team member assignments, follow-up scheduling, and Meta Conversions API syncing.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=leads"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <Users className="h-3 w-3" />
                    Open Pipeline
                  </Link>
                  <a
                    href="/api/leads/export?format=csv"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    Export CSV
                  </a>
                </div>
              </div>

              {/* Media Library Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-amber-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      Cloudflare R2
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Media Asset Manager
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Direct presigned uploads to Cloudflare R2 bucket, metadata categorization, image optimizer, and re-usable media picker.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=media"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700"
                  >
                    <ImageIcon className="h-3 w-3" />
                    Media Library
                  </Link>
                </div>
              </div>

              {/* Marketing Content Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-purple-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                      <Globe2 className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                      EN / BN
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Bilingual Content & CMS
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Side-by-side English and Bengali copy editor with optimistic concurrency locking and translation parity checks.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=content"
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                  >
                    Edit Content
                  </Link>
                  <Link
                    href="/admin/cms?tab=sections"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    Sections
                  </Link>
                </div>
              </div>

              {/* Pricing & Calculator Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <DollarSign className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      Commercial
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Pricing Plans & Matrix
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Configure tiers, billing frequencies, feature checklists, and toggle public pricing visibility on or off.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=pricing"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Configure Pricing
                  </Link>
                </div>
              </div>

              {/* Settings & Telemetry Card */}
              <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-400/40 hover:shadow-md dark:border-white/10 dark:bg-[#11131a]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      <Settings className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-400">
                      System
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    Site Settings & Logs
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Brand metadata, contact details, social links, integration webhook audit logs, and cache controls.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <Link
                    href="/admin/cms?tab=settings"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/admin/cms?tab=integrations"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    Integrations
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="mt-6">
          <AdminUsersPanel role={role} currentUserId={userId} />
        </main>
      )}
    </div>
  );
}
