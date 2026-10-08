/**
 * Meta Conversions API provider (Task 13 §3).
 *
 * Sends a server-side `Lead` event with the same `event_id` the browser pixel fires, so
 * Meta deduplicates the pair into one conversion. Two rules are non-negotiable:
 *
 *  1. PII is SHA-256 hashed before it leaves the Worker, and the raw values are never
 *     logged. Meta matches on the hash, so nothing else needs the plaintext.
 *  2. Hashing uses WebCrypto (`crypto.subtle`), never `node:crypto`. This module runs on
 *     Cloudflare Workers, where `node:crypto` is only reachable through `nodejs_compat`
 *     shims and `createHash` is not guaranteed to exist.
 *
 * Unconfigured (no pixel id or no token) is not a failure: the lead is already stored, and
 * the provider reports `skipped` so the admin sees `Skipped` rather than a fake `Failed`.
 */
import { envString } from '@/lib/env';
import { registerProvider, type TrackLeadInput, type TrackLeadResult } from '@/lib/events';

const GRAPH_VERSION = 'v21.0';
/** Truncated so a Graph error cannot dump an unbounded body into the lead row. */
const MAX_ERROR_LENGTH = 300;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Meta's normalisation rules: trim + lowercase for email, digits only for phone (country
 * code included, no `+`, spaces or dashes), then SHA-256.
 */
export async function hashForMeta(value: string): Promise<string | undefined> {
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalised)));
}

export async function hashPhoneForMeta(phone: string): Promise<string | undefined> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(digits)));
}

interface MetaConfig {
  pixelId: string;
  token: string;
  testCode: string;
}

function readConfig(): MetaConfig {
  return {
    // `envString` reads the Worker binding first and falls back to process.env, which is
    // what makes the same code work in a request, at build time and in plain Node.
    pixelId: envString('NEXT_PUBLIC_META_PIXEL_ID'),
    token: envString('META_CAPI_TOKEN'),
    testCode: envString('META_TEST_EVENT_CODE'),
  };
}

async function sendLead(input: TrackLeadInput): Promise<TrackLeadResult> {
  const { pixelId, token, testCode } = readConfig();
  if (!pixelId || !token) return { ok: true, skipped: true };

  const [em, ph] = await Promise.all([
    hashForMeta(input.email),
    hashPhoneForMeta(input.phone),
  ]);

  /**
   * Field allowlist (H-1/Decision 14 data minimization).
   *
   * FULL event (`minimal`/`light` unset — instant mode + manual retry): hashed
   * email/phone, click IDs, client IP/UA for matching, event metadata, and the
   * internal lead id for reconciliation.
   *
   * MINIMIZED event (`minimal: true` — validated-mode full `Lead`): hashed
   * identifiers + event metadata ONLY. Never sent: `fbp`/`fbc`, `client_ip_address`,
   * `client_user_agent`, `custom_data`, name, or any raw PII. The signal Meta learns
   * on is "a validated lead converted", not the lead's data.
   *
   * LIGHT event (`light: true` — validated-mode instant event): event metadata +
   * `fbp`/`fbc` passthrough ONLY. Not even hashed identifiers: Meta learns "data
   * arrived" with no lead data at all.
   */
  const userData: Record<string, unknown> = {};
  // `em`/`ph` are arrays of hashes per the Graph schema; fbp/fbc are passthrough values.
  if (!input.light) {
    if (em) userData.em = [em];
    if (ph) userData.ph = [ph];
  }
  if (!input.minimal) {
    if (input.fbp) userData.fbp = input.fbp;
    if (input.fbc) userData.fbc = input.fbc;
    if (!input.light) {
      if (input.clientIp) userData.client_ip_address = input.clientIp;
      if (input.userAgent) userData.client_user_agent = input.userAgent;
    }
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName ?? 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        // Deduplication key shared with the browser pixel. Meta collapses the pair.
        event_id: input.eventId,
        action_source: 'website',
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        ...(input.minimal || input.light
          ? {}
          : { custom_data: { lead_id: input.leadId, source: 'landing_page_lead_form' } }),
      },
    ],
  };
  if (testCode) body.test_event_code = testCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The token travels in a header, not the query string: URLs end up in logs and
          // error reports, headers do not.
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, MAX_ERROR_LENGTH);
      return { ok: false, error: `Meta CAPI ${response.status}: ${detail}` };
    }
    // A 200 body can still carry a per-event error (`events_received: 0`); surface it.
    const payload: unknown = await response.json().catch(() => null);
    const eventsReceived =
      typeof payload === 'object' && payload !== null
        ? (payload as { events_received?: unknown }).events_received
        : undefined;
    if (typeof eventsReceived === 'number' && eventsReceived === 0) {
      return { ok: false, error: 'Meta CAPI accepted the request but received 0 events' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error reaching Meta CAPI' };
  }
}

registerProvider({ name: 'MetaCAPI', trackLead: sendLead });
