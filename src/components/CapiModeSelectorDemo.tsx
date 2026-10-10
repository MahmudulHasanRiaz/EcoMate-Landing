'use client';

import { useState } from 'react';
import { BadgeCheck, TriangleAlert } from 'lucide-react';
import type { LandingContent } from '@/src/types/landing';

type Copy = LandingContent['adBudgetDefense'];

/**
 * Ad-budget-defense CAPI mode selector. A native radiogroup: arrow keys move
 * between modes, selection panel updates in an `aria-live` region.
 */
export function CapiModeSelectorDemo({ copy, defaultModeId }: { copy: Copy; defaultModeId?: string }) {
  const [selectedId, setSelectedId] = useState(defaultModeId ?? copy.modes[0]?.id ?? '');
  const selected = copy.modes.find((mode) => mode.id === selectedId) ?? copy.modes[0];

  return (
    <div className="v2-surface rounded-3xl p-5 sm:p-8" data-testid="capi-mode-demo">
      <div role="radiogroup" aria-label={copy.eyebrow} className="grid gap-2.5 sm:grid-cols-2">
        {copy.modes.map((mode) => {
          const active = mode.id === selectedId;
          const recommended = mode.id === 'capi';
          return (
            <label
              key={mode.id}
              className="v2-focus relative cursor-pointer rounded-2xl p-4 transition-transform hover:scale-[1.01]"
              style={{
                backgroundColor: active ? 'var(--v2-accent-soft)' : 'var(--v2-bg-3)',
                border: `1.5px solid ${active ? 'var(--v2-accent)' : 'var(--v2-line)'}`,
              }}
            >
              <input
                type="radio"
                name="demo-capi-mode"
                value={mode.id}
                checked={active}
                onChange={() => setSelectedId(mode.id)}
                className="sr-only"
              />
              {recommended && (
                <span
                  className="absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: 'var(--v2-ok)' }}
                >
                  {copy.recommendBadge}
                </span>
              )}
              <p className="flex items-center gap-2 text-sm font-bold">
                {mode.id === 'capi' ? (
                  <BadgeCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
                )}
                {mode.title}
              </p>
              <p className="font-mono-numbers mt-1.5 text-xs font-semibold" style={{ color: 'var(--v2-blue)' }}>
                {mode.matchQuality}
              </p>
            </label>
          );
        })}
      </div>

      {selected && (
        <div
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}
          aria-live="polite"
          data-testid="capi-mode-detail"
        >
          <p className="text-sm leading-relaxed v2-muted">{selected.description}</p>
          <ul className="font-mono-numbers mt-3 flex flex-wrap gap-2">
            {selected.events.map((event) => (
              <li
                key={event}
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--v2-bg-4)' }}
              >
                {event}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[11px] v2-muted">{copy.dedupNote}</p>
    </div>
  );
}
