/**
 * Conversion-tracking provider bus (Task 13 §2).
 *
 * One call site (`lib/leadDispatch.ts`) fans a tracked lead out to every registered
 * provider, so adding TikTok Events API, GA4 Measurement Protocol or a CRM webhook later is
 * a new provider file plus a `registerProvider` call — no change to the lead POST handler.
 *
 * Providers must never throw: a tracking failure is a logged failure, not a failed lead.
 */

export interface TrackLeadInput {
  leadId: number;
  name: string;
  phone: string;
  email: string;
  /** `_fbp` cookie value at submit time (raw, never hashed — Meta requires the exact value). */
  fbp: string;
  /** `_fbc` click-id cookie value at submit time. */
  fbc: string;
  /** Shared with the browser pixel: Meta deduplicates on `event_name` + `event_id`. */
  eventId: string;
  clientIp: string;
  userAgent: string;
  eventSourceUrl: string;
  /**
   * CAPI event name (H-1/Decision 14). Default `'Lead'` (instant mode + manual retry).
   * In validated mode the submit-time event uses the admin-configured instant name
   * (default `'LeadInitiated'`); the browser fires the same name with the same
   * `event_id` so the pair still deduplicates.
   */
  eventName?: string;
  /**
   * Minimized payload (H-1 data minimization): when true only the hashed
   * identifiers + event metadata are sent — no click IDs, IPs, user agents or
   * custom data. The validated-mode full `Lead` event uses this.
   */
  minimal?: boolean;
  /**
   * Lightweight signal (H-1 validated mode): event metadata + fbp/fbc passthrough
   * only — no hashed identifiers either. The submit-time instant event uses this so
   * Meta learns "data arrived" without receiving any lead data. Never combined with
   * `minimal` (light already excludes everything minimal excludes, and more).
   */
  light?: boolean;
}

export interface TrackLeadResult {
  ok: boolean;
  error?: string;
  /**
   * True when the provider is deliberately not configured. The lead is not at fault and
   * must not be marked `Failed` — it is `Skipped`, which is a reversible admin state.
   */
  skipped?: boolean;
}

export interface TrackingProvider {
  name: string;
  trackLead(input: TrackLeadInput): Promise<TrackLeadResult>;
}

export interface TrackingDispatchResult {
  provider: string;
  ok: boolean;
  skipped: boolean;
  error: string;
}

const providers: TrackingProvider[] = [];

/** Idempotent by name: a hot-reloaded module must not register the same provider twice. */
export function registerProvider(provider: TrackingProvider): void {
  if (providers.some((existing) => existing.name === provider.name)) return;
  providers.push(provider);
}

export function registeredProviders(): string[] {
  return providers.map((provider) => provider.name);
}

/**
 * Send one lead to every provider, sequentially and never in parallel: a Worker isolate has
 * a single sub-request budget, and a `Promise.all` over N providers makes a burst of N
 * outbound requests at once.
 */
export async function dispatchLeadTracked(input: TrackLeadInput): Promise<TrackingDispatchResult[]> {
  const results: TrackingDispatchResult[] = [];
  for (const provider of providers) {
    try {
      const result = await provider.trackLead(input);
      results.push({
        provider: provider.name,
        ok: result.ok,
        skipped: result.skipped === true,
        error: result.error ?? '',
      });
      if (!result.ok) console.error(`[Tracking ${provider.name} error]`, result.error);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ provider: provider.name, ok: false, skipped: false, error: message });
      console.error(`[Tracking ${provider.name} threw]`, e);
    }
  }
  return results;
}
