import { getCloudflareContext } from '@opennextjs/cloudflare';
import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import { asObject, errorMessage, fail, logServerError, ok, readString } from '@/lib/json';
import { dispatchLead } from '@/lib/licensePortal';

// Per-isolate best effort. A Worker has no shared memory across the fleet, so this is a
// backstop in front of the WAF rule and the KV limiter (Task 14), not the only defence.
const WINDOW_MS = 600_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; expiresAt: number }>();

export async function GET() {
  try {
    const rows = await getDb().select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/leads', e);
    return fail(errorMessage(e));
  }
}

export async function POST(req: Request) {
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

    const body = asObject(await req.json());
    const name = readString(body.name).trim();
    const phone = readString(body.phone).trim();
    if (!name) return fail('Name is required', 400);
    if (phone.length < 8) return fail('A valid phone number is required', 400);

    const [lead] = await getDb()
      .insert(leadsTable)
      .values({
        name,
        phone,
        email: readString(body.email).trim(),
        dailyVolume: readString(body.dailyVolume, '150 – 500 orders / day'),
        note: readString(body.note).trim(),
        source: readString(body.source, 'landing_page_lead_form'),
        utmSource: readString(body.utmSource),
        utmCampaign: readString(body.utmCampaign),
      })
      .returning();

    keepAlive(dispatchLead(lead.id));

    return ok(
      {
        success: true,
        leadId: lead.id,
        message:
          'Demo request registered successfully. Our operations team will reach out promptly.',
      },
      201,
    );
  } catch (e) {
    logServerError('POST /api/leads', e);
    return fail(errorMessage(e));
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
