'use client';

import { useEffect, useRef, useState } from 'react';
import { Barcode, CheckCircle2, Lock, RotateCcw, ScanLine, XCircle } from 'lucide-react';
import {
  initialPackingState,
  isPackingComplete,
  scanPackingItem,
} from '@/lib/demoLogic';
import type { LandingContent } from '@/src/types/landing';

type Copy = LandingContent['packingWorkspace'];

/**
 * Interactive packing-scan demo. Visitor scans each item in order; scanning out
 * of order blocks the label, mirroring the warehouse floor. Local state only —
 * no backend writes. Fully keyboard operable (native buttons) with an
 * `aria-live` status region.
 */
export function PackingScanDemo({ copy }: { copy: Copy }) {
  const [state, setState] = useState(initialPackingState);
  const [scanning, setScanning] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = copy.items.length;
  const complete = isPackingComplete(state, total);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleScan = (index: number) => {
    if (scanning !== null || complete) return;
    setScanning(index);
    timer.current = setTimeout(() => {
      setState((prev) => scanPackingItem(prev, index, total));
      setScanning(null);
    }, 600);
  };

  const handleReset = () => {
    if (timer.current) clearTimeout(timer.current);
    setScanning(null);
    setState(initialPackingState());
  };

  return (
    <div className="v2-surface rounded-3xl p-5 sm:p-8" data-testid="packing-scan-demo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono-numbers text-xs sm:text-sm font-semibold tracking-wide">
          {copy.orderLabel}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            complete
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
          }`}
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {complete ? copy.verifiedBadge : copy.blockedBadge}
        </span>
      </div>

      {/* Scanner viewport with sweep line */}
      <div
        className="relative mt-4 overflow-hidden rounded-2xl border border-dashed p-4"
        style={{ borderColor: 'var(--v2-line)', backgroundColor: 'var(--v2-bg-3)' }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-3">
          <ScanLine className="h-6 w-6" style={{ color: 'var(--v2-accent)' }} />
          <div className="relative h-10 flex-1 overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--v2-bg-4)' }}>
            {scanning !== null && <div className="v2-scanline absolute inset-x-2 top-0 h-px" style={{ backgroundColor: 'var(--v2-blue)', boxShadow: '0 0 12px var(--v2-blue)' }} />}
          </div>
          <Barcode className="h-6 w-6 v2-muted" />
        </div>
      </div>

      <ol className="mt-4 space-y-2.5">
        {copy.items.map((item, index) => {
          const verified = state.scanned.includes(index);
          const isNext = index === state.scanned.length && !complete;
          return (
            <li
              key={item.sku}
              className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3"
              style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="font-mono-numbers text-xs v2-muted">SKU: {item.sku}</p>
              </div>
              {verified ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {copy.verifiedBadge}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleScan(index)}
                  disabled={scanning !== null || complete}
                  aria-label={`${copy.scanButton}: ${item.sku}`}
                  className="v2-focus shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: isNext ? 'var(--v2-accent)' : 'var(--v2-muted)' }}
                >
                  {scanning === index ? copy.scanningText : copy.scanButton}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono-numbers text-xs v2-muted" aria-live="polite">
          {state.scanned.length}/{total} {copy.progressLabel}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="v2-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium v2-muted hover:opacity-80"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.resetButton}
        </button>
      </div>

      <div aria-live="polite" className="mt-2">
        {complete ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {copy.successHeading}
            </p>
            <p className="mt-1 text-xs leading-relaxed v2-muted">{copy.successBody}</p>
          </div>
        ) : state.blocked ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-300">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {copy.mismatchHeading}
            </p>
            <p className="mt-1 text-xs leading-relaxed v2-muted">{copy.mismatchBody}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] v2-muted">{copy.demoNote}</p>
    </div>
  );
}
