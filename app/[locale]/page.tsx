/**
 * `/{locale}` — the locale-scoped marketing page.
 *
 * `/en` renders the same page as `/` (the root entry point, kept for its existing inbound
 * links) and `/bn` renders it in Bangla. `notFound()` for anything else lives in
 * `app/[locale]/layout.tsx`; this file only has to resolve the locale and hand it to the
 * shared composition.
 */
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { LandingPage } from '@/src/components/LandingPage';

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // The layout already 404s an unknown locale; repeating it here means this page can never
  // render an empty document if it is ever reached without the layout.
  if (!isLocale(locale)) notFound();

  return <LandingPage locale={locale} />;
}