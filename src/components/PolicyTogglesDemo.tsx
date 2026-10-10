'use client';

import { useState } from 'react';
import { PiggyBank, ShieldCheck } from 'lucide-react';
import { protectionTotal, toggleId } from '@/lib/demoLogic';
import type { LandingContent } from '@/src/types/landing';

type Copy = LandingContent['revenueProtection'];

/**
 * Revenue-protection policy toggles. Each switch is a real `role="switch"` with
 * `aria-checked`; the total is derived from the CMS display amounts (digits
 * parsed, prefix inherited from the first policy so no currency is hardcoded).
 */
export function PolicyTogglesDemo({ copy, locale }: { copy: Copy; locale: 'en' | 'bn' }) {
  const [enabled, setEnabled] = useState<string[]>(() => copy.policies.map((policy) => policy.id));
  const total = protectionTotal(copy.policies, enabled);
  const prefix = copy.policies[0]?.monthlySavings.replace(/[0-9০-৯,.\s]+/g, '') ?? '';
  const formattedTotal = `${prefix} ${new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US').format(total)}`.trim();

  return (
    <div className="v2-surface rounded-3xl p-5 sm:p-8" data-testid="policy-toggles-demo">
      <ul className="space-y-2.5">
        {copy.policies.map((policy) => {
          const on = enabled.includes(policy.id);
          return (
            <li
              key={policy.id}
              className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5"
              style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck
                    className="h-4 w-4 shrink-0"
                    style={{ color: on ? 'var(--v2-ok)' : 'var(--v2-muted)' }}
                    aria-hidden="true"
                  />
                  {policy.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed v2-muted">{policy.detail}</p>
                <p className="font-mono-numbers mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  {policy.monthlySavings}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={policy.title}
                onClick={() => setEnabled((prev) => toggleId(prev, policy.id))}
                className="v2-focus relative h-7 w-12 shrink-0 rounded-full transition-colors"
                style={{ backgroundColor: on ? 'var(--v2-ok)' : 'var(--v2-bg-4)' }}
              >
                <span
                  className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={{ left: on ? '1.5rem' : '0.25rem' }}
                />
                <span className="sr-only">{on ? copy.enabledBadge : copy.disabledBadge}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-4"
        style={{ backgroundColor: 'var(--v2-accent-soft)', border: '1px solid var(--v2-line)' }}
        aria-live="polite"
      >
        <p className="flex items-center gap-2 text-sm font-bold">
          <PiggyBank className="h-5 w-5" style={{ color: 'var(--v2-accent)' }} aria-hidden="true" />
          {copy.totalLabel}
        </p>
        <p className="font-mono-numbers text-lg sm:text-xl font-bold" data-testid="protection-total">
          {formattedTotal}
        </p>
      </div>
      <p className="mt-2 text-[11px] v2-muted">{copy.totalNote}</p>
    </div>
  );
}
