'use client';

/**
 * C1 systemic instant feedback (fix/perf-overhaul): the ONE async-action primitive for
 * the whole admin panel.
 *
 * Contract:
 * - pending → caller disables + shows spinner + sets `aria-busy` (no double-submit).
 * - error → toast (minimal inline toast stack, no new dependency) + caller-visible message.
 * - settle → re-enable always (no stuck disabled button).
 *
 * No fire-and-forget mutating button: every `fetch(POST/PUT/PATCH/DELETE)` goes through
 * `run()` (hook) or `AsyncButton` (drop-in). Safe optimistic updates stay at call sites
 * (C2) — this only owns pending/error/settle.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'error' | 'notice';

type Toast = { id: number; kind: ToastKind; message: string };

let toastSeq = 1;
const toastListeners = new Set<(toasts: Toast[]) => void>();
let toastState: Toast[] = [];

function emitToasts(): void {
  for (const fn of toastListeners) fn([...toastState]);
}

export function pushToast(message: string, kind: ToastKind = 'error'): void {
  const id = toastSeq++;
  toastState = [...toastState.slice(-3), { id, kind, message }];
  emitToasts();
  window.setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id);
    emitToasts();
  }, 5000);
}

export function useToasts(): Toast[] {
  const [toasts, setToasts] = useState<Toast[]>(() => [...toastState]);
  useEffect(() => {
    const fn = (next: Toast[]): void => setToasts(next);
    toastListeners.add(fn);
    return () => {
      toastListeners.delete(fn);
    };
  }, []);
  return toasts;
}

export function ToastStack(): React.JSX.Element | null {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={
            t.kind === 'error'
              ? 'rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 shadow-lg dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-200'
              : 'rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 shadow-lg dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-200'
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface AsyncAction {
  pending: boolean;
  error: string | null;
  run: <T>(fn: () => Promise<T>, opts?: { errorPrefix?: string }) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncAction(): AsyncAction {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (mounted.current) setError(null);
  }, []);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts?: { errorPrefix?: string }): Promise<T | null> => {
      if (mounted.current) {
        setPending(true);
        setError(null);
      }
      try {
        return await fn();
      } catch (e) {
        const message =
          (opts?.errorPrefix ? `${opts.errorPrefix}: ` : '') +
          (e instanceof Error ? e.message : 'Request failed');
        if (mounted.current) setError(message);
        pushToast(message, 'error');
        return null;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [],
  );

  return { pending, error, run, reset };
}

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
}

/** Drop-in mutating button: spinner + disabled + aria-busy while `loading`. */
export function AsyncButton({
  loading = false,
  disabled,
  children,
  ...rest
}: AsyncButtonProps): React.JSX.Element {
  const isBusy = loading || disabled === true;
  return (
    <button type="button" disabled={isBusy} aria-busy={loading} {...rest}>
      <span className="inline-flex items-center gap-1.5">
        {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
        {children}
      </span>
    </button>
  );
}

/** Skeleton block for tables/panels (C2): sized to final dimensions to hold CLS at 0. */
export function Skeleton({
  className = '',
  lines = 3,
}: {
  className?: string;
  lines?: number;
}): React.JSX.Element {
  return (
    <div aria-busy="true" aria-label="Loading" className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="mb-2 h-4 rounded-md bg-slate-200/80 dark:bg-white/10 motion-shimmer"
        />
      ))}
    </div>
  );
}
