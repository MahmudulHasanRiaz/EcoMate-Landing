/**
 * `/{locale}/terms` — CMS-editable terms of service (Task 20 §6).
 *
 * Same shape as the privacy page: the `legal.terms` row of `landing_content`
 * via `getLandingContent`, static fallback in `lib/legal.ts`, Article metadata
 * with `inLanguage`.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getLandingContent } from '@/lib/content';
import { LEGAL_TERMS_KEY, legalDoc } from '@/lib/legal';
import { LOCALES, isLocale } from '@/lib/locales';
import { articleJsonLd, breadcrumbJsonLd, localeAlternates, localeHomePath, localeUrl, ogLocale, serializeJsonLd } from '@/lib/seo';

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
  const doc = legalDoc(sections, LEGAL_TERMS_KEY, locale);
  return {
    title: `${doc.title} | EcoMate`,
    description: doc.intro.slice(0, 160),
    alternates: localeAlternates(locale, 'terms'),
    openGraph: {
      type: 'article',
      url: localeUrl(locale, 'terms'),
      title: `${doc.title} | EcoMate`,
      description: doc.intro.slice(0, 160),
      locale: ogLocale(locale),
    },
  };
}

export default async function TermsPage({ params }: LegalPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sections = await getLandingContent(locale).catch(() => null);
  const doc = legalDoc(sections, LEGAL_TERMS_KEY, locale);
  const homeHref = localeHomePath(locale);
  const url = localeUrl(locale, 'terms');

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
              { name: doc.title, path: 'terms' },
            ]),
          ),
        }}
      />
      <span dangerouslySetInnerHTML={{ __html: '<!-- LAWYER-REVIEW: liability and dispute-resolution wording need counsel sign-off -->' }} />
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
