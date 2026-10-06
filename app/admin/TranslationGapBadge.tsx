'use client';

/**
 * Translation-gap badge for the admin dashboard (Task 15 §6).
 *
 * Its own small component rather than inline markup in `AdminConsole` because the fetch is
 * conditional on role and has three distinct states that must not collapse into each other:
 *
 *  - **`null` (loading or fetch failed)** — nothing is rendered. A `0` here would be a lie:
 *    an editor who is refused by `/api/admin/i18n-report` would see "0 untranslated" and
 *    conclude the site is fully translated.
 *  - **role is `editor`** — the endpoint is superadmin/admin only, so the request is never
 *    made at all. No 403 round trip on every dashboard load.
 *  - **`gapCount === 0`** — a quiet "fully translated" pill, which is the badge's resting
 *    state on a healthy site. Rendering nothing would make the metric undiscoverable.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Languages } from 'lucide-react';
import type { I18nReport } from '@/src/types/api';
import type { AdminRole } from '@/lib/roles';

export function TranslationGapBadge({ role }: { role: AdminRole }) {
  const [report, setReport] = useState<I18nReport | null>(null);
  const canRead = role === 'superadmin' || role === 'admin';

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    fetch('/api/admin/i18n-report')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: I18nReport | null) => {
        if (!cancelled) setReport(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  if (!canRead || !report) return null;

  const gaps = report.gapCount;
  return (
    <Link
      href="/admin/cms"
      title={
        gaps === 0
          ? 'Every landing section has a published Bangla payload'
          : `${gaps} landing section${gaps === 1 ? '' : 's'} render English copy at /bn until translated`
      }
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
        gaps > 0
          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200'
          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200'
      }`}
    >
      <Languages className="h-4 w-4" />
      {gaps === 0 ? 'BN fully translated' : `${gaps} untranslated`}
    </Link>
  );
}