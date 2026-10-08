/**
 * GET /api/leads/export?format=csv — lead export (Task 16 §2).
 *
 * ## Access
 *
 * `superadmin`/`admin` only, through `requireAdminRole` rather than `proxy.ts`: the proxy
 * answers "is there a session" and sees nothing but a cookie, and a CSV of every lead is the
 * entire customer database in one file. It is audited through `lib/audit.ts` for the same
 * reason — an unlogged bulk read of PII is exactly the event an auditor asks about later.
 *
 * ## The 10,000-row cap
 *
 * Hard, and not a pagination parameter. This endpoint streams a whole table in one response;
 * without a ceiling a 500k-row leads table would be built entirely in isolate memory and fail
 * the request (or exhaust the Worker). The cap is reported in a trailer-style header rather
 * than silently truncating the file, so an operator who hits it knows there are more rows and
 * can narrow by date.
 *
 * ## CSV correctness
 *
 * Escaping and the UTF-8 BOM live in `lib/csv.ts`; the short version is that a lead note is
 * attacker-controlled free text which may contain commas, quotes and newlines, so every cell
 * goes through RFC 4180 quoting and formula-leading cells are neutralised. A hand-rolled
 * `join(',')` here would silently shift every later column.
 */
import { and, desc, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import { recordAudit } from '@/lib/audit';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { csvDocument, UTF8_BOM, type CsvCell } from '@/lib/csv';
import { errorMessage, fail, failWithRequestId, logServerError } from '@/lib/json';
import { clientIp, requestId } from '@/lib/request';

/** Maximum rows in one export. See the file header for why this is a hard ceiling. */
export const EXPORT_ROW_CAP = 10_000;

const COLUMNS = [
  'id',
  'name',
  'phone',
  'email',
  'daily_volume',
  'status',
  'source',
  'utm_source',
  'utm_campaign',
  'assigned_to_id',
  'note',
  'internal_notes',
  'consent_given',
  'consent_at',
  'meta_capi_status',
  'license_portal_status',
  'follow_up_at',
  'anonymized_at',
  'created_at',
  'updated_at',
] as const;

/** ISO timestamp or empty string — an absent date must not print `Invalid Date`. */
function iso(value: Date | null): string {
  return value ? value.toISOString() : '';
}

export async function GET(req: Request): Promise<Response> {
  const reqId = requestId(req);
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') ?? 'csv';
    if (format.toLowerCase() !== 'csv') {
      return Response.json(
        { error: 'Only format=csv is supported', requestId: reqId },
        { status: 400 },
      );
    }

    // Optional `before` bound so an operator can split a large table into date ranges. Read
    // through `Date.parse` because it is the same coercion Postgres applies to a timestamp
    // parameter, and an unparseable value is a 400 rather than a query against `NaN`.
    const beforeRaw = url.searchParams.get('before');
    let before: Date | null = null;
    if (beforeRaw !== null && beforeRaw !== '') {
      before = new Date(beforeRaw);
      if (Number.isNaN(before.getTime())) {
        return Response.json(
          { error: 'before must be an ISO date', requestId: reqId },
          { status: 400 },
        );
      }
    }

    // The `before` bound is applied in SQL rather than by filtering the fetched rows: with a
    // 10k cap, filtering afterwards would silently return fewer rows than the operator asked
    // for and look like data loss.
    const rows = await getDb()
      .select()
      .from(leadsTable)
      .where(before === null ? undefined : lt(leadsTable.createdAt, before))
      .orderBy(desc(leadsTable.createdAt), desc(leadsTable.id))
      // One extra row, to detect truncation without a second COUNT query.
      .limit(EXPORT_ROW_CAP + 1);

    const truncated = rows.length > EXPORT_ROW_CAP;
    const inRange = truncated ? rows.slice(0, EXPORT_ROW_CAP) : rows;

    const body =
      UTF8_BOM +
      csvDocument(
        COLUMNS,
        inRange.map((row): CsvCell[] => [
          row.id,
          row.name,
          row.phone,
          row.email ?? '',
          row.dailyVolume ?? '',
          row.status,
          row.source ?? '',
          row.utmSource ?? '',
          row.utmCampaign ?? '',
          row.assignedToId ?? '',
          row.note ?? '',
          row.internalNotes ?? '',
          row.consentGiven,
          iso(row.consentAt),
          row.metaCapiStatus,
          row.licensePortalStatus,
          iso(row.followUpAt),
          iso(row.anonymizedAt),
          iso(row.createdAt),
          iso(row.updatedAt),
        ]),
      );

    // The audit write is awaited rather than fired and forgotten: an export of the full PII
    // table that is not in the trail is worse than no export at all. It is best-effort inside
    // `recordAudit` (a failure is logged, never thrown), so it cannot fail the export.
    await recordAudit({
      actorId: guard.actorId,
      action: 'LEAD_EXPORT',
      target: `rows=${inRange.length}${truncated ? ` (capped at ${EXPORT_ROW_CAP})` : ''}`,
      ip: clientIp(req),
    });

    console.log(
      JSON.stringify({
        event: 'lead.export',
        level: 'info',
        requestId: reqId,
        actorId: guard.actorId,
        rowCount: inRange.length,
        truncated,
      }),
    );

    // `no-store` matters here specifically: this is a downloadable file of personal data, and
    // an intermediary cache holding it would outlive the session that fetched it.
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ecomate-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store, private',
        'X-Row-Count': String(inRange.length),
        'X-Row-Cap': String(EXPORT_ROW_CAP),
        'X-Truncated': truncated ? 'true' : 'false',
      },
    });
  } catch (e) {
    logServerError('GET /api/leads/export', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}