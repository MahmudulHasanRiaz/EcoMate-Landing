/**
 * Locale loading skeleton (Task 20 §1).
 *
 * Preserves layout height (hero + two section blocks) so CLS stays under
 * budget while the locale page streams in. Pure CSS pulse — no client JS,
 * no data reads, safe under `prefers-reduced-motion` (Tailwind's
 * `motion-safe:` guards the animation).
 */
export default function LocaleLoading() {
  return (
    <div
      aria-hidden="true"
      className="min-h-screen bg-[#F2F3F9] dark:bg-[#07080E]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="h-8 w-32 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
          <div className="hidden gap-2 sm:flex">
            <div className="h-8 w-20 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="h-8 w-20 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="h-8 w-28 rounded-xl bg-indigo-200 motion-safe:animate-pulse dark:bg-indigo-500/20" />
          </div>
        </div>
        <div className="py-14 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto h-5 w-48 rounded-full bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="mx-auto mt-6 h-10 w-full max-w-xl rounded-xl bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="mx-auto mt-3 h-10 w-4/5 rounded-xl bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="mx-auto mt-6 h-5 w-3/5 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-11 w-40 rounded-xl bg-indigo-200 motion-safe:animate-pulse dark:bg-indigo-500/20" />
              <div className="h-11 w-32 rounded-xl bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 pb-20 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border border-slate-200 bg-white motion-safe:animate-pulse dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
