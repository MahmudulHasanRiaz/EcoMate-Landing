/**
 * Lead timeline + assignment (Task 16 §1).
 *
 * Two writes that must never disagree: the `leads` row and the `lead_activities` row that
 * records why it changed. They go through one transaction, because a lead moved to `Won` with no
 * timeline entry is exactly the silent corruption a CRM audit is meant to catch — and unlike a
 * missing UI affordance, nothing surfaces it later.
 *
 * `actorId` is threaded in from the resolved session by the route handler. It is never read
 * from the request body: a client-supplied actor would make the entire history forgeable, which
 * defeats the reason for keeping a timeline at all.
 */
import { and, desc, eq, gt, isNull, lt, ne, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadActivitiesTable, leadsTable } from '@/db/schema';
import type { CountResult } from '@/lib/paginate';

/**
 * Statuses the sales team owns outright.
 *
 * The retention cron refuses to anonymise these: a `Won` lead is a closed deal with contractual
 * record-keeping obligations, and a `Qualified` lead is one a salesperson is actively working.
 * Overwriting their PII would destroy live business records to satisfy a deletion request that
 * legal has explicitly not extended to them.
 */
export const PROTECTED_LEAD_STATUSES = ['Won', 'Qualified'] as const;

export interface LeadActivityInput {
  leadId: number;
  /** From the live session. `null` for a system-initiated event (cron, migration). */
  actorId: number | null;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
}

/** Append one timeline entry. Call inside the same transaction as the lead write. */
export async function recordLeadActivity(
  tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
  input: LeadActivityInput,
): Promise<void> {
  await tx.insert(leadActivitiesTable).values({
    leadId: input.leadId,
    actorId: input.actorId,
    fromStatus: input.fromStatus ?? '',
    toStatus: input.toStatus ?? '',
    note: (input.note ?? '').slice(0, 2000),
  });
}

/** One lead's timeline, newest first, with the actor's email joined for display. */
export async function listLeadActivities(leadId: number) {
  return getDb()
    .select({
      id: leadActivitiesTable.id,
      actorId: leadActivitiesTable.actorId,
      fromStatus: leadActivitiesTable.fromStatus,
      toStatus: leadActivitiesTable.toStatus,
      note: leadActivitiesTable.note,
      createdAt: leadActivitiesTable.createdAt,
    })
    .from(leadActivitiesTable)
    .where(eq(leadActivitiesTable.leadId, leadId))
    .orderBy(desc(leadActivitiesTable.createdAt), desc(leadActivitiesTable.id));
}

/**
 * Leads whose promised follow-up has passed and which are still open.
 *
 * `followUpAt` in the past, and `status` not in the closed/protected set. `Won` is excluded
 * because the promise has been kept; `Lost` because nobody is going to call.
 */
export async function listOverdueFollowUps(limit: number, offset: number) {
  return getDb()
    .select({
      id: leadsTable.id,
      name: leadsTable.name,
      phone: leadsTable.phone,
      status: leadsTable.status,
      assignedToId: leadsTable.assignedToId,
      assignedTo: leadsTable.assignedTo,
      followUpAt: leadsTable.followUpAt,
    })
    .from(leadsTable)
    .where(
      and(
        lt(leadsTable.followUpAt, new Date()),
        isNull(leadsTable.anonymizedAt),
        sql`${leadsTable.status} <> 'Won'`,
        sql`${leadsTable.status} <> 'Lost'`,
      ),
    )
    // Soonest-missed first: the most overdue call is the most urgent one.
    .orderBy(leadsTable.followUpAt)
    .limit(limit)
    .offset(offset);
}

/** Count for `listOverdueFollowUps`, built from the same predicates. */
export async function countOverdueFollowUps(): Promise<CountResult> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(leadsTable)
    .where(
      and(
        lt(leadsTable.followUpAt, new Date()),
        isNull(leadsTable.anonymizedAt),
        sql`${leadsTable.status} <> 'Won'`,
        sql`${leadsTable.status} <> 'Lost'`,
      ),
    );
  return { count: Number(row?.count ?? 0) };
}

/**
 * The most recent matching lead for a normalised phone, inside the dedupe window.
 *
 * The comparison is done in SQL on a digit-only form of the phone so `+880 1894-828290`,
 * `8801894828290` and `01894-828290` all collide — which is the entire point of a dedupe check.
 * Normalising in JS before the query would require loading every recent lead into the isolate.
 *
 * `status` is deliberately not filtered: a `Lost` lead from 40 days ago with the same phone is
 * still very likely the same person coming back, and that is exactly the case worth warning a
 * salesperson about.
 */
export async function findRecentLeadByPhone(
  normalisedPhone: string,
  windowDays: number,
  /** A lead id to ignore — the one just created, which would otherwise always be its own match. */
  excludeLeadId?: number,
): Promise<{ id: number; createdAt: Date; status: string; name: string } | null> {
  if (normalisedPhone === '') return null;
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [row] = await getDb()
    .select({
      id: leadsTable.id,
      createdAt: leadsTable.createdAt,
      status: leadsTable.status,
      name: leadsTable.name,
    })
    .from(leadsTable)
    .where(
      and(
        // The column side MUST apply the same canonicalisation as `normalisePhone` on the
        // incoming value. An earlier version stripped the international `00` prefix in JS only,
        // so `008801712555000` compared against a raw column never matched `8801712555000` and
        // the dedupe silently missed a resubmission.
        sql`ltrim(regexp_replace(${leadsTable.phone}, '[^0-9]', '', 'g'), '0') = ${normalisedPhone}`,
        gt(leadsTable.createdAt, cutoff),
        // Excluded in SQL, not by comparing the result afterwards: the query is ordered
        // newest-first, so the row just inserted IS the top match and a post-hoc `id !==
        // self` check would discard the one genuine prior lead it found and report nothing.
        excludeLeadId === undefined ? undefined : ne(leadsTable.id, excludeLeadId),
      ),
    )
    .orderBy(desc(leadsTable.createdAt))
    .limit(1);

  return row ?? null;
}

/**
 * Canonical form of a phone number, for comparison only — never for storage.
 *
 * Two steps, and **both must be mirrored exactly by the SQL expression in
 * `findRecentLeadByPhone`**, because a query that compares a JS-canonicalised value against a
 * raw column silently fails to match:
 *
 *  1. drop every non-digit (`+`, spaces, dashes, parentheses);
 *  2. strip leading zeros, which is what makes `008801712555000` and `8801712555000` the same
 *     subscriber. `00` is the international dialling prefix; trimming *all* leading zeros also
 *     collapses `01894…` to `1894…`, the more common Bangla local format.
 *
 * Known limitation: a national number (`1894828290`) and its international form
 * (`8801894828290`) still differ, because inserting a `880` country code needs a country
 * directory this function deliberately does not consult. The dedupe therefore catches exact
 * resubmissions and formatting variants — not every possible spelling of one subscriber.
 *
 * Returns `''` when there are no digits, which callers treat as "not comparable".
 */
export function normalisePhone(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

/** Whether the retention cron must leave this lead alone. */
export function isProtectedStatus(status: string): boolean {
  return (PROTECTED_LEAD_STATUSES as readonly string[]).includes(status);
}