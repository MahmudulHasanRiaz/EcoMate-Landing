'use client';

/**
 * Route-level error boundary (Task 20 §1).
 *
 * Renders when a segment under `app/` throws during render or data fetching.
 * Offers a retry (`reset`) and a way back home — an error page that strands
 * the visitor strands the lead. Dark navy + violet, matching the site shell.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F2F3F9] text-slate-900 dark:bg-[#07080E] dark:text-slate-100">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          This page hit a snag
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Please try again — your place is saved. If it keeps happening, reach us
          directly and we will help.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:brightness-105"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Back to home
          </a>
          <a
            href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20hit%20an%20error%20on%20the%20site."
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
          >
            WhatsApp us
          </a>
        </div>
      </main>
    </div>
  );
}
