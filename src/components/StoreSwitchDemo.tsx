'use client';

import { useState } from 'react';
import { CheckCircle2, Store } from 'lucide-react';
import { allStoresSynced, toggleStore } from '@/lib/demoLogic';
import type { LandingContent } from '@/src/types/landing';

type Copy = LandingContent['storeSwitches'];

/**
 * Multi-store & showroom sync switchboard. Pausing a store simulates a stock
 * freeze; the all-synced banner holds the zero-overselling guarantee message.
 */
export function StoreSwitchDemo({ copy }: { copy: Copy }) {
  const [paused, setPaused] = useState<string[]>([]);
  const synced = allStoresSynced(paused);

  return (
    <div className="v2-surface rounded-3xl p-5 sm:p-8" data-testid="store-switch-demo">
      <ul className="space-y-2.5">
        {copy.stores.map((store) => {
          const isPaused = paused.includes(store.id);
          return (
            <li
              key={store.id}
              className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5"
              style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Store
                    className="h-4 w-4 shrink-0"
                    style={{ color: isPaused ? 'var(--v2-muted)' : 'var(--v2-accent)' }}
                    aria-hidden="true"
                  />
                  {store.name}
                </p>
                <p className="font-mono-numbers mt-0.5 text-[11px] v2-muted">{store.meta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className="hidden rounded-full px-2.5 py-0.5 text-[10px] font-bold sm:inline"
                  style={{
                    backgroundColor: isPaused ? 'var(--v2-bg-4)' : 'var(--v2-accent-soft)',
                    color: isPaused ? 'var(--v2-muted)' : 'var(--v2-accent)',
                  }}
                >
                  {isPaused ? copy.pausedBadge : copy.syncedBadge}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isPaused}
                  aria-label={`${store.name} — ${isPaused ? copy.pausedBadge : copy.syncedBadge}`}
                  onClick={() => setPaused((prev) => toggleStore(prev, store.id))}
                  className="v2-focus relative h-7 w-12 rounded-full transition-colors"
                  style={{ backgroundColor: isPaused ? 'var(--v2-bg-4)' : 'var(--v2-accent)' }}
                >
                  <span
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
                    style={{ left: isPaused ? '0.25rem' : '1.5rem' }}
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="mt-4">
        {synced ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {copy.allSyncedMessage}
          </p>
        ) : (
          <p className="rounded-xl px-4 py-3 text-xs leading-relaxed v2-muted" style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}>
            {copy.syncNote}
          </p>
        )}
      </div>
    </div>
  );
}
