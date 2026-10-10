'use client';

import { useState } from 'react';
import { CheckCircle2, RotateCcw, Truck } from 'lucide-react';
import { canBook, confirmBooking, initialBookingState, selectCourier } from '@/lib/demoLogic';
import type { LandingContent } from '@/src/types/landing';

type Copy = LandingContent['logisticsAutomation'];

/**
 * Logistics-automation courier booking demo. Native radio inputs keep the
 * courier choice keyboard operable for free; booking state is local only.
 */
export function CourierBookingDemo({ copy }: { copy: Copy }) {
  const [state, setState] = useState(initialBookingState);
  const booked = copy.couriers.find((courier) => courier.id === state.selectedId);

  return (
    <div className="v2-surface rounded-3xl p-5 sm:p-8" data-testid="courier-booking-demo">
      <div role="radiogroup" aria-label={copy.selectLabel} className="grid gap-2.5 sm:grid-cols-3">
        {copy.couriers.map((courier) => {
          const selected = state.selectedId === courier.id;
          return (
            <label
              key={courier.id}
              className="v2-focus cursor-pointer rounded-2xl p-4 transition-transform hover:scale-[1.01]"
              style={{
                backgroundColor: selected ? 'var(--v2-accent-soft)' : 'var(--v2-bg-3)',
                border: `1.5px solid ${selected ? 'var(--v2-accent)' : 'var(--v2-line)'}`,
              }}
            >
              <input
                type="radio"
                name="demo-courier"
                value={courier.id}
                checked={selected}
                onChange={() => setState((prev) => selectCourier(prev, courier.id))}
                className="sr-only"
              />
              <p className="flex items-center gap-2 text-sm font-bold">
                <Truck className="h-4 w-4" style={{ color: 'var(--v2-accent)' }} aria-hidden="true" />
                {courier.name}
              </p>
              <p className="font-mono-numbers mt-2 text-sm font-bold">{courier.fee}</p>
              <p className="font-mono-numbers text-[11px] v2-muted">{courier.eta}</p>
              <p className="font-mono-numbers text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                {courier.successRate}
              </p>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!state.booked ? (
          <button
            type="button"
            disabled={!canBook(state)}
            onClick={() => setState((prev) => confirmBooking(prev))}
            className="v2-focus rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: 'var(--v2-accent)' }}
          >
            {copy.bookButton}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setState(initialBookingState())}
            className="v2-focus inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--v2-bg-3)', border: '1px solid var(--v2-line)' }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {copy.resetButton}
          </button>
        )}
      </div>

      <div aria-live="polite" className="mt-2">
        {state.booked && booked ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {copy.bookedHeading} · {booked.name}
            </p>
            <p className="mt-1 text-xs leading-relaxed v2-muted">{copy.bookedBody}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] v2-muted">{copy.demoNote}</p>
    </div>
  );
}
