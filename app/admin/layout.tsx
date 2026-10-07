import type { Metadata } from 'next';

/**
 * Admin section shell.
 *
 * `robots: { index: false, follow: false }` keeps operator screens out of search results —
 * an indexed login page is an invitation to credential stuffing. The `Cache-Control:
 * no-store` half of the requirement is set in `proxy.ts`, because Next 16 rejects route
 * segment config in a Proxy file and Cache Components removed `export const dynamic`.
 */
export const metadata: Metadata = {
  title: 'EcoMate Admin',
  robots: { index: false, follow: false },
};

/**
 * Admin routes block on the session read, and that is deliberate.
 *
 * Every page under `/admin` awaits `auth()`, which reads cookies — inherently dynamic,
 * so these routes render on demand with no static shell. (Previously `instant = false`;
 * removed with Cache Components 2026-10-07 — without the flag that export is a build
 * error, and dynamic-by-default already covers cookie-reading routes.)
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#07080E] dark:text-slate-100">{children}</div>;
}
