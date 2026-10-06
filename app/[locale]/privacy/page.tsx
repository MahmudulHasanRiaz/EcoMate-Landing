/**
 * `/{locale}/privacy` — CMS-editable privacy policy (Task 20 §6).
 *
 * Content comes from the `legal.privacy` row of `landing_content` for this
 * locale (via `getLandingContent`, the single `'use cache'` boundary), with the
 * honest static fallback in `lib/legal.ts` when the row is missing or the DB
 * is unreachable. Carries Article-appropriate metadata including `inLanguage`.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getLandingContent } from '@/lib/content';
import { LEGAL_PRIVACY_KEY, legalDoc } from '@/lib/legal';
import { LOCALES, isLocale } from '@/lib/locales';
import { articleJsonLd, breadcrumbJsonLd, localeAlternates, localeUrl, serializeJsonLd } from '@/lib/seo';

interface LegalPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sections = await getLandingContent(locale).catch(() => null);
  const doc = legalDoc(sections, LEGAL_PRIVACY_KEY, locale);
  return {
    title: `${doc.title} | EcoMate`,
    description: doc.intro.slice(0, 160),
    alternates: localeAlternates(locale, 'privacy'),
    openGraph: {
      type: 'article',
      url: localeUrl(locale, 'privacy'),
      title: `${doc.title} | EcoMate`,
      description: doc.intro.slice(0, 160),
      locale,
    },
  };
}

export default async function PrivacyPage({ params }: LegalPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sections = await getLandingContent(locale).catch(() => null);
  const doc = legalDoc(sections, LEGAL_PRIVACY_KEY, locale);
  const homeHref = locale === 'bn' ? '/bn' : '/';
  const url = localeUrl(locale, 'privacy');

  return (
    <div className="min-h-screen bg-[#F2F3F9] text-slate-900 dark:bg-[#07080E] dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            articleJsonLd({
              title: doc.title,
              description: doc.intro.slice(0, 160),
              url,
              author: 'EcoMate',
              datePublished: doc.updated,
              dateModified: doc.updated,
              section: 'Legal',
              locale,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbJsonLd(locale, [
              { name: locale === 'bn' ? 'হোম' : 'Home', path: '' },
              { name: doc.title, path: 'privacy' },
            ]),
          ),
        }}
      />
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <span dangerouslySetInnerHTML={{ __html: '<!-- LAWYER-REVIEW: retention window (180 days) and Won/Qualified exclusion need counsel sign-off -->' }} />
      <span dangerouslySetInnerHTML={{ __html: '<!-- LAWYER-REVIEW: Meta Pixel/CAPI disclosure wording needs counsel sign-off -->' }} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href={homeHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === 'bn' ? 'হোম' : 'Home'}
        </Link>
        <article className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {locale === 'bn' ? 'হালনাগাদ: ' : 'Last updated: '}
            <time dateTime={doc.updated}>{doc.updated}</time>
          </p>
          <p className="mt-4 leading-relaxed text-slate-700 dark:text-slate-300">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="text-lg font-bold">{section.heading}</h2>
              <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">{section.body}</p>
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
