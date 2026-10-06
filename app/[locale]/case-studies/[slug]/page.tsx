/**
 * `/{locale}/case-studies/{slug}` — the public case-study page (Task 15 §2, §4).
 *
 * Same shape and same rationale as `blog/[slug]`: a cached read from `lib/content.ts`, a
 * per-locale canonical plus hreflang, an OG image resolved from `featured_image_url`, and a
 * `BreadcrumbList` node one level deeper than the blog.
 *
 * The three body fields (`problemOverview` → `solutionImplemented` → `quantifiedOutcome`)
 * render as plain paragraphs rather than injected HTML: they are admin-authored *text*
 * columns, not markup, so there is nothing to sanitise and nothing for `BlogContent` to do.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCaseStudies, getCaseStudy } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { LOCALES, isLocale } from '@/lib/locales';
import { PRERENDER_PROBE_SLUG } from '@/lib/prerender-probe';
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  localeAlternates,
  localeUrl,
  ogImageUrl,
  serializeJsonLd,
} from '@/lib/seo';

interface CaseStudyPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const CRUMBS = {
  en: { home: 'Home' },
  bn: { home: 'হোম' },
} as const;

/**
 * Enumerate every published study under both locales.
 *
 * Same reasoning as the blog page: a dynamic route with no build-time list cannot be
 * prerendered under Cache Components. Note that the empty case is not only an outage —
 * `getCaseStudies` returns `null` for a table with nothing published in it — and Cache
 * Components rejects a zero-entry result in both cases, so the empty case emits one probe
 * entry per locale instead. See `lib/prerender-probe.ts` for the full rationale.
 */
export async function generateStaticParams() {
  const studies = (await getCaseStudies().catch(() => null)) ?? [];
  const entries = LOCALES.flatMap((locale) => studies.map((study) => ({ locale, slug: study.slug })));
  return entries.length > 0
    ? entries
    : LOCALES.map((locale) => ({ locale, slug: PRERENDER_PROBE_SLUG }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const study = await getCaseStudy(slug);
  if (!study) return { robots: { index: false, follow: true } };

  const title = study.seoTitle || study.title;
  const description = study.seoDescription || study.quantifiedOutcome;
  const image = ogImageUrl(study.featuredImageUrl);
  const path = `case-studies/${study.slug}`;

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: 'article',
      url: localeUrl(locale, path),
      title,
      description,
      locale,
      modifiedTime: study.lastModified,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  // Unconditional, and ahead of the read: the prerender probe must 404 regardless of database
  // state or of an admin having typed the same string as a slug. See `lib/prerender-probe.ts`.
  if (slug === PRERENDER_PROBE_SLUG) notFound();

  const study = await getCaseStudy(slug);
  if (!study) notFound();

  // Same literal-vs-computed-route tradeoff as the blog page: `typedRoutes` cannot prove a
  // computed dynamic path, so the home link is written out.
  const homeHref = locale === 'bn' ? '/bn' : '/';
  const crumbs = CRUMBS[locale];
  const image = ogImageUrl(study.featuredImageUrl);
  const url = localeUrl(locale, `case-studies/${study.slug}`);
  const description = study.seoDescription || study.quantifiedOutcome;

  const metrics = Array.isArray(study.metrics)
    ? study.metrics.filter(
        (metric): metric is { label: string; stat: string } =>
          typeof metric === 'object' &&
          metric !== null &&
          typeof (metric as { label?: unknown }).label === 'string' &&
          typeof (metric as { stat?: unknown }).stat === 'string',
      )
    : [];

  return (
    <div className="min-h-screen bg-[#F2F3F9] text-slate-900 dark:bg-[#07080E] dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            articleJsonLd({
              title: study.title,
              description,
              url,
              // A case study has no author column; the publisher's own engineering desk is the
              // honest attribution rather than a fabricated byline.
              author: 'EcoMate',
              datePublished: study.lastModified,
              ...(image ? { imageUrl: image } : {}),
              section: study.businessType,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            // Home → study only. There is no `/[locale]/case-studies` index route, so a
            // "Case Studies" crumb would carry an `item` that 404s — see the blog page for
            // the same reasoning.
            breadcrumbJsonLd(locale, [
              { name: crumbs.home, path: '' },
              { name: study.title, path: `case-studies/${study.slug}` },
            ]),
          ),
        }}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href={homeHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {crumbs.home}
        </Link>

        <article className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {study.businessType}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{study.title}</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {study.client} · <time dateTime={study.lastModified}>{formatDate(study.lastModified, locale)}</time>
          </p>

          {study.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={absoluteUrl(study.featuredImageUrl)}
              alt={study.title}
              className="mt-6 w-full rounded-2xl border border-slate-200 dark:border-white/10"
              loading="eager"
            />
          ) : null}

          {metrics.length > 0 ? (
            <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</dt>
                  <dd className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">{metric.stat}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <section className="mt-8">
            <h2 className="text-lg font-bold">
              {locale === 'bn' ? 'সমস্যা' : 'The problem'}
            </h2>
            <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">
              {study.problemOverview}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold">
              {locale === 'bn' ? 'সমাধান' : 'The solution'}
            </h2>
            <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">
              {study.solutionImplemented}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-bold">
              {locale === 'bn' ? 'ফলাফল' : 'The outcome'}
            </h2>
            <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300">
              {study.quantifiedOutcome}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}