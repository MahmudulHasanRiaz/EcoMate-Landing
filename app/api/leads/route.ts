import { getCloudflareContext } from '@opennextjs/cloudflare';
import { desc, eq, sql } from 'drizzle-orm';
import { requireAdminRole } from '@/lib/authz';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import {
  errorMessage,
  fail,
  failWithRequestId,
  logServerError,
  ok,
  readString,
} from '@/lib/json';
import { dispatchLeadIntegrations } from '@/lib/leadDispatch';
import {
  countOverdueFollowUps,
  findRecentLeadByPhone,
  listOverdueFollowUps,
  normalisePhone,
  recordLeadActivity,
} from '@/lib/leads';
import { notifyNewLead } from '@/lib/notify';
import { paginate, parsePage } from '@/lib/paginate';
import { clientIp as clientIpOf, requestId } from '@/lib/request';
import { hitLimit } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/turnstile';
import { leadCreate } from '@/lib/validation';

// Registers the Resend adapter on import. No call site changes when it becomes active.
import '@/lib/notifyResend';

/**
 * Dedupe warning window. A lead with the same phone inside this many days is reported, never
 * blocked: the same person resubmitting a form is common and legitimate (they dropped out, they
 * want a different plan), and refusing the submission loses the lead to fix a data-quality
 * problem. The salesperson decides.
 */
const DEDUPE_WINDOW_DAYS = 90;

// Per-isolate best effort, deliberately kept as the *backstop* behind the KV limiter
// (Task 14 §1) and the WAF rule (Task 8): a Worker has no shared memory across the fleet,
// so this map only covers one isolate's lifetime — but it also covers the case where KV is
// not bound (local dev) or a KV call fails open.
const WINDOW_MS = 600_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; expiresAt: number }>();

/** Distributed window: 5 lead submissions per 10 minutes per source IP. */
const KV_LIMIT_MAX = 5;
const KV_LIMIT_WINDOW_SEC = 600;

/** Version identifier stored on every consented lead (Task 13 §5, Task 20 §5). */
const PRIVACY_POLICY_VERSION = 'privacy-v1';
const MAX_TRACKING_VALUE = 200;
const MAX_USER_AGENT = 512;

/** `crypto.randomUUID` exists on Node 19+ and every Workers runtime; the fallback keeps a
 *  lead submittable in exotic environments rather than failing the request. */
function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    const random = Math.random().toString(36).slice(2, 10);
    return `lead-${Date.now().toString(36)}-${random}`;
  }
}

/** Event ids come from the client; they are opaque identifiers, so constrain their shape. */
function readEventId(value: unknown): string {
  const candidate = readString(value).trim();
  return /^[A-Za-z0-9._:-]{8,80}$/.test(candidate) ? candidate : newEventId();
}

/**
 * Paginated lead list (Task 16 §4).
 *
 * `?overdue=1` returns the follow-up worklist instead of the main list. The two have different
 * WHERE clauses *and* different orderings (newest-first vs soonest-missed-first), so they are
 * separate queries rather than one query with a mode flag — a shared query would need two
 * divergent filter sets, and only one of the two counts would then be correct.
 */
export async function GET(req: Request) {
  const reqId = requestId(req);

  // Role-gated, not merely session-gated. A lead row carries name, phone, email, client IP
  // and user agent — personal data. The role model gives `editor` content access only, so an
  // editor must not be able to page through every lead. This route was previously reachable by
  // any signed-in role; the proxy only proves a session exists, not that it may see leads.
  const guard = await requireAdminRole(['superadmin', 'admin']);
  if (!guard.ok) return guard.response;

  try {
    if (wantsOverdue(req.url)) {
      const page = await paginate(
        req.url,
        (limit, offset) => listOverdueFollowUps(limit, offset),
        countOverdueFollowUps,
      );
      return ok(page);
    }

    const status = statusFilter(req.url);
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(leadsTable)
          // `id` is the tiebreaker: two leads created in the same millisecond must not swap
          // places between page 1 and page 2 on the next request.
          .orderBy(desc(leadsTable.createdAt), desc(leadsTable.id))
          .where(status ? eq(leadsTable.status, status) : undefined)
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(leadsTable)
          .where(status ? eq(leadsTable.status, status) : undefined);
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/leads', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}

/** `overdue=1|true` selects the follow-up worklist. */
function wantsOverdue(url: string): boolean {
  try {
    const value = new URL(url).searchParams.get('overdue');
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
}

/** Status filter for the main list. An unrecognised value is ignored, not rejected. */
function statusFilter(url: string): string | null {
  try {
    const value = new URL(url).searchParams.get('status');
    return value !== null && value !== '' && value !== 'All' ? value : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const reqId = requestId(req);
  try {
    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown-ip';
    const now = Date.now();
    const rec = hits.get(ip);
    if (rec && rec.expiresAt > now && rec.count >= MAX_PER_WINDOW) {
      return fail('Too many requests. Please try again in a few minutes or call us directly.', 429);
    }
    hits.set(
      ip,
      rec && rec.expiresAt > now
        ? { count: rec.count + 1, expiresAt: rec.expiresAt }
        : { count: 1, expiresAt: now + WINDOW_MS },
    );
    // Bound the map: an isolate can live for hours and would otherwise accumulate one
    // entry per source IP it ever saw.
    if (hits.size > 1000) {
      for (const [key, value] of hits) if (value.expiresAt <= now) hits.delete(key);
    }

    // Fleet-wide sliding window (Task 14 §1). Runs after the per-isolate backstop so a
    // burst inside one isolate is rejected without a KV round-trip, and before any body
    // parsing so an abusive caller never reaches Turnstile or the database.
    if (await hitLimit(`lead:${ip}`, KV_LIMIT_MAX, KV_LIMIT_WINDOW_SEC)) {
      return fail('Too many requests. Please try again in a few minutes or call us directly.', 429);
    }

    const parsed = leadCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // Trimmed after validation: the shape/length bounds already held on the raw input.
    const name = parsed.data.name.trim();
    const phone = parsed.data.phone.trim();
    const clientIp = clientIpOf(req);
    // Consent is a legal prerequisite, not a preference: without it there is no lawful
    // basis to store the PII, let alone send a conversion event to Meta. `consentGiven`
    // is `z.literal(true)`, so reaching here means it was given.
    const consentText = (parsed.data.consentText?.trim().slice(0, 120) || PRIVACY_POLICY_VERSION);

    // Bot check (Task 14 §2). Skipped when Turnstile is not provisioned (local dev); an
    // explicit siteverify rejection is a 400 and the lead is never stored. Consent is
    // validated first so an invalid submission costs no external call.
    const turnstile = await verifyTurnstile(parsed.data.turnstileToken ?? '', ip);
    if (!turnstile.ok) {
      console.warn(`[leads] turnstile rejected a submission: ${turnstile.reason}`);
      return fail('Human verification failed. Please refresh the page and try again.', 400);
    }

    const source = parsed.data.source ?? 'landing_page_lead_form';

    /**
     * The lead row and its opening timeline entry commit together.
     *
     * A lead with no `lead_activities` row is a lead whose history starts mid-story, which is
     * precisely the corruption the timeline exists to prevent — so the two writes are one
     * transaction rather than two calls that happen to run in order.
     *
     * `actorId: null` is correct here rather than an omission: this row was created by an
     * anonymous visitor. The status changes that follow are what carry a real operator id.
     */
    const [lead] = await getDb().transaction(async (tx) => {
      const inserted = await tx
        .insert(leadsTable)
        .values({
          name,
          phone,
          email: parsed.data.email?.trim() ?? '',
          dailyVolume: parsed.data.dailyVolume ?? '150 – 500 orders / day',
          note: parsed.data.note?.trim() ?? '',
          source,
          utmSource: parsed.data.utmSource ?? '',
          utmCampaign: parsed.data.utmCampaign ?? '',
          // --- tracking + consent (Task 13) ---------------------------------------------
          fbp: parsed.data.fbp?.trim().slice(0, MAX_TRACKING_VALUE) ?? '',
          fbc: parsed.data.fbc?.trim().slice(0, MAX_TRACKING_VALUE) ?? '',
          eventId: readEventId(parsed.data.eventId),
          clientIp,
          userAgent: readString(req.headers.get('user-agent')).slice(0, MAX_USER_AGENT),
          consentGiven: true,
          consentAt: new Date(),
          consentText,
        })
        .returning();

      const created = inserted[0];
      if (!created) throw new Error('Lead insert returned no row');

      await recordLeadActivity(tx, {
        leadId: created.id,
        actorId: null,
        toStatus: created.status,
        note: `Lead captured from ${source}`,
      });

      return inserted;
    });
    if (!lead) throw new Error('Lead insert returned no row');

    /**
     * Dedupe warning — a warning, never a block.
     *
     * Run after the insert on purpose: the alternative (checking first and returning an error)
     * turns a data-quality signal into a lost lead, and the same person resubmitting the form
     * is a completely normal thing for them to do. The response carries the matched id so the
     * form can tell the visitor their enquiry is already on file, while the operator still
     * gets the row.
     */
    let duplicateWarning: { leadId: number; createdAt: string; status: string } | null = null;
    try {
      // The new row is excluded inside the query: it is always the newest match, so checking
      // afterwards would throw away the genuine prior lead it found.
      const match = await findRecentLeadByPhone(
        normalisePhone(phone),
        DEDUPE_WINDOW_DAYS,
        lead.id,
      );
      if (match) {
        duplicateWarning = {
          leadId: match.id,
          createdAt: match.createdAt.toISOString(),
          status: match.status,
        };
      }
    } catch (e) {
      // A failed dedupe check must never cost a lead: the row is already committed, so
      // failing here would report an error for a lead that is safely stored.
      logServerError('POST /api/leads (dedupe warning)', e, reqId);
    }

    // Meta CAPI + License Portal + notification, all handed to the platform. `keepAlive`
    // reuses `ctx.waitUntil` so a recycled isolate cannot cancel any of them — and the lead
    // row is already committed, so a dispatch failure never loses the lead.
    keepAlive(Promise.all([dispatchLeadIntegrations(lead.id), notifyNewLead(lead)]));

    return ok(
      {
        success: true,
        leadId: lead.id,
        eventId: lead.eventId,
        message:
          'Demo request registered successfully. Our operations team will reach out promptly.',
        // Absent (rather than null) when there is no match, so a client can feature-detect on
        // the key existing instead of on a falsy-but-present field.
        ...(duplicateWarning ? { duplicateWarning } : {}),
      },
      201,
    );
  } catch (e) {
    logServerError('POST /api/leads', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}

/**
 * Hand background work to the platform instead of leaving it as a bare floating promise.
 *
 * A `.catch()` after the response has been returned can be cancelled the moment the
 * isolate is recycled, and the lead would silently never reach the License Portal.
 * `ctx.waitUntil` keeps the isolate alive until the promise settles. Outside a Worker
 * request (`next dev`, tests) there is no execution context, and the promise — already
 * running, already carrying its own `.catch` — simply continues.
 */
function keepAlive(work: Promise<unknown>): void {
  const settled = work.catch((error: unknown) => logServerError('lead dispatch', error));
  try {
    getCloudflareContext().ctx.waitUntil(settled);
  } catch {
    // No Cloudflare context: nothing to hand off to.
  }
}
