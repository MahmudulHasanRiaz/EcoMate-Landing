'use client';

/**
 * Admin console: session header, link into the existing CMS panel, and the operator
 * management tab.
 *
 * The legacy full-screen `AdminPanel` keeps its own route (`/admin/cms`) instead of being
 * nested here: it is a fixed overlay with its own header, and stacking a second chrome on
 * top of it would only fight over z-index.
 */
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { LayoutDashboard, LogOut, ShieldCheck, ExternalLink } from 'lucide-react';
import type { AdminRole } from '@/lib/roles';
import { AdminUsersPanel } from './AdminUsersPanel';

interface AdminConsoleProps {
  email: string;
  role: AdminRole;
  userId: string;
}

export function AdminConsole({ email, role, userId }: AdminConsoleProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
            EcoMate Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Control Center</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Signed in as <span className="font-medium text-slate-700 dark:text-slate-200">{email || 'unknown'}</span>{' '}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {role}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/cms"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open CMS panel
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" />
            Public site
          </Link>
          <button
            type="button"
            onClick={() => {
              void signOut({ callbackUrl: '/admin/login' });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mt-8">
        <AdminUsersPanel role={role} currentUserId={userId} />
      </main>
    </div>
  );
}
