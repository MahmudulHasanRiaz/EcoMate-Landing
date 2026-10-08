/**
 * Meta CAPI two-mode settings reader (H-1/Decision 14).
 *
 * The owner-configured mode lives on the `site_settings` singleton row:
 * - `instant` (default): full `Lead` event on submit, browser + server.
 * - `validated`: lightweight instant event on submit (browser + server, no full
 *   data), then the full server-side `Lead` event only when a lead's status is
 *   updated TO `meta_lead_status_trigger`.
 *
 * Fail direction: any read problem (missing row, DB error, timeout, garbage value)
 * falls back to instant mode with safe defaults — the pre-2b behavior. A settings
 * read must never break lead capture or turn a dispatch into an unhandled rejection.
 */
import { getDb } from '@/db/client';
import { siteSettingsTable } from '@/db/schema';
import { logServerError } from '@/lib/json';
import { withTimeout } from '@/lib/withTimeout';

export type MetaCapiMode = 'instant' | 'validated';

export interface MetaCapiSettings {
  mode: MetaCapiMode;
  /** Lead status whose transition triggers the full Lead event in validated mode. '' = unconfigured. */
  trigger: string;
  /** Lightweight submit-time event name in validated mode (default 'LeadInitiated'). */
  instantEventName: string;
}

const DEFAULT_INSTANT_EVENT_NAME = 'LeadInitiated';

/** Meta custom event names: letters, digits, underscores — anything else is rejected server-side. */
function validEventName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_]{1,40}$/.test(trimmed) ? trimmed : null;
}

export function defaultMetaCapiSettings(): MetaCapiSettings {
  return { mode: 'instant', trigger: '', instantEventName: DEFAULT_INSTANT_EVENT_NAME };
}

export async function getMetaCapiSettings(): Promise<MetaCapiSettings> {
  try {
    const [row] = await withTimeout(
      getDb()
        .select({
          metaCapiMode: siteSettingsTable.metaCapiMode,
          metaLeadStatusTrigger: siteSettingsTable.metaLeadStatusTrigger,
          metaInstantEventName: siteSettingsTable.metaInstantEventName,
        })
        .from(siteSettingsTable)
        .limit(1),
      'getMetaCapiSettings',
    );
    if (!row) return defaultMetaCapiSettings();
    return {
      // Unknown values degrade to least surprise: the pre-2b behavior.
      mode: row.metaCapiMode === 'validated' ? 'validated' : 'instant',
      trigger: typeof row.metaLeadStatusTrigger === 'string' ? row.metaLeadStatusTrigger : '',
      instantEventName: validEventName(row.metaInstantEventName) ?? DEFAULT_INSTANT_EVENT_NAME,
    };
  } catch (e) {
    logServerError('getMetaCapiSettings', e);
    return defaultMetaCapiSettings();
  }
}
