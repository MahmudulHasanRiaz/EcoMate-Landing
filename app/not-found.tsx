/**
 * Brand-styled 404 (Task 20 §1).
 *
 * A 404 that offers a human is a lead: home, language homes, and the WhatsApp
 * contact are all one tap away. Server component — no client JS needed.
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F2F3F9] text-slate-900 dark:bg-[#07080E] dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          404 — Page not found
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          This address does not exist
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          The link may be old or mistyped. Start from the home page — or talk to
          a human directly and we will point you right.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:brightness-105"
          >
            Back to home
          </Link>
          <Link
            href="/en"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            English home
          </Link>
          <Link
            href="/bn"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Bangla home
          </Link>
          <a
            href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20could%20not%20find%20a%20page."
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
          >
            WhatsApp us
          </a>
        </div>
        <p className="mt-6 text-[11px] text-slate-500 dark:text-slate-400">
          Looking for an article? Start at{' '}
          <Link href="/" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            home
          </Link>{' '}
          and use the navigation — the blog lives under /en/blog and /bn/blog.
        </p>
      </main>
    </div>
  );
}
