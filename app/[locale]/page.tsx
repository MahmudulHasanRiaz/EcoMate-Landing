/**
 * `/{locale}` — the locale-scoped marketing page.
 *
 * `/en` renders the same page as `/` (the root entry point, kept for its existing inbound
 * links) and `/bn` renders it in Bangla. `notFound()` for anything else lives in
 * `app/[locale]/layout.tsx`; this file only has to resolve the locale and render the
 * shared composition.
 *
 * Data seeding lives in the locale layout (`app/[locale]/layout.tsx`): it reads
 * `getLandingContent(locale)` + both menus for this locale and seeds
 * `LocaleThemeProvider`, so `LandingShell` below reads everything — locale, theme,
 * content, menus, pricing visibility — from `useLanding()`. No fetch here.
 */
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { LandingShell } from '@/src/components/LandingShell';

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // The layout already 404s an unknown locale; repeating it here means this page can never
  // render an empty document if it is ever reached without the layout.
  if (!isLocale(locale)) notFound();

  return <LandingShell />;
}
