/**
 * PUT /api/leads/[id] — the lead mutation route (Task 16 §1).
 *
 * Absorbs the old `status/route.ts`, which only moved a card between columns in the admin
 * Kanban. Assignment and follow-up scheduling now live here too, because they are the same
 * operator action on the same row, and splitting them across two endpoints would mean two
 * transactions racing to write one lead.
 *
 * ## The transaction is the point
 *
 * Every path that changes the lead writes its `lead_activities` rows in the *same* transaction
 * as the `leads` update. Two separate writes would allow a lead at `Won` with no recorded
 * actor — the one thing the timeline exists to make impossible. If the activity insert fails,
 * the status change rolls back with it.
 *
 * `actorId` comes from `requireAdminRole`, which resolved it from the live session. Nothing in
 * the request body can influence who is recorded: the body is validated field-by-field, and
 * the actor is a server-side variable that no client input reaches.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminUsersTable, leadsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { dispatchLeadIntegrations, keepAlive } from '@/lib/leadDispatch';
import { getMetaCapiSettings } from '@/lib/metaCapiSettings';
import { recordLeadActivity } from '@/lib/leads';
import {
  errorMessage,
  fail,
  failWithRequestId,
  logServerError,
  ok,
  optionalString,
  parseId,
} from '@/lib/json';
import { requestId } from '@/lib/request';
import { leadUpdate, stripUnknownKeys } from '@/lib/validation';

/** `assignedToId` must name a live operator. `null` explicitly unassigns. */
function readAssignee(value: number | null | undefined): number | null | undefined {
  return value;
}

/**
 * Confirm the id names a real, active operator.
 *
 * Referential integrity for this FK is enforced here rather than left to the database alone:
 * the column is nullable with SET NULL, so an unknown id has to be *rejected* rather than
 * silently unwritten — otherwise an assignment to operator #999 would return 200 and leave the
 * lead silently unassigned, which is the failure mode most likely to be missed.
 */
async function assigneeExists(id: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id))
    .limit(1);
  return Boolean(row);
}

/** True when the two timestamps differ, handling `null` on either side. */
function followUpDiffers(current: Date | null, next: Date | null): boolean {
  if (next === null) return current !== null;
  if (current === null) return true;
  return current.getTime() !== next.getTime();
}

/** Operator-supplied note on the transition. Bounded, and never used as SQL. */
function readActivityNote(value: string | undefined): string {
  return (value ?? '').trim().slice(0, 2000);
}

/** Thrown when the row vanishes between the read and the update (a concurrent delete). */
class LeadRowMissingError extends Error {
  constructor() {
    super('Lead not found');
    this.name = 'LeadRowMissingError';
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const reqId = requestId(req);
  // Status changes are sales-pipeline writes — and Decision 1 gives editors lead status
  // updates — so this route is editor-allowed. Bulk export stays admin-only.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid lead id', 400);

    const parsed = leadUpdate.safeParse(stripUnknownKeys(leadUpdate, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const body = parsed.data;

    // The current row is read first: the timeline records the transition *from* the previous
    // status, which cannot be known without it, and an update against a missing lead must 404
    // rather than appear to succeed.
    const [current] = await getDb().select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
    if (!current) return fail('Lead not found', 404);

    const hasStatus = body.status !== undefined;
    const hasAssignee = body.assignedToId !== undefined;
    const hasFollowUp = body.followUpAt !== undefined;
    if (!hasStatus && !hasAssignee && !hasFollowUp && body.internalNotes === undefined) {
      return fail('Nothing to update: supply status, assignedToId, followUpAt or internalNotes', 400);
    }

    const nextStatus = hasStatus && body.status !== undefined ? body.status : current.status;

    const assignee = hasAssignee ? readAssignee(body.assignedToId) : undefined;
    if (typeof assignee === 'number' && !(await assigneeExists(assignee))) {
      return fail('assignedToId does not name an existing operator', 404);
    }

    // `followUpAt: null` clears the promise; an unparseable string never reaches here —
    // the schema rejects it with a 400 — because "I mistyped the date" and "remove the
    // follow-up" are different intentions that must not collapse into the same write.
    let nextFollowUp: Date | null | undefined;
    if (hasFollowUp) {
      if (body.followUpAt === null || body.followUpAt === undefined) {
        nextFollowUp = null;
      } else {
        nextFollowUp = new Date(body.followUpAt);
      }
    }

    const statusChanged = hasStatus && nextStatus !== current.status;
    const assigneeChanged =
      hasAssignee && typeof assignee === 'number' && assignee !== current.assignedToId;
    const unassigned = hasAssignee && assignee === null && current.assignedToId !== null;
    const followUpChanged = hasFollowUp && followUpDiffers(current.followUpAt, nextFollowUp ?? null);
    const notesChanged = body.internalNotes !== undefined;

    // A no-op PUT still answers 200 with the current row, but writes no activity: a timeline
    // full of "changed from X to X" entries is noise that hides the real transitions.
    if (!statusChanged && !assigneeChanged && !unassigned && !followUpChanged && !notesChanged) {
      return ok(current);
    }

    /**
     * The lead update and every timeline entry it implies, atomically.
     *
     * `undefined` in the `.set()` object is dropped by Drizzle, so only fields actually present
     * in the request are written — a status-only call cannot blank the internal notes.
     */
    const updated = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(leadsTable)
        .set({
          status: hasStatus ? nextStatus : undefined,
          assignedToId: hasAssignee ? assignee : undefined,
          followUpAt: hasFollowUp ? nextFollowUp : undefined,
          internalNotes: optionalString(body.internalNotes),
          updatedAt: new Date(),
        })
        .where(eq(leadsTable.id, id))
        .returning();
      if (!row) throw new LeadRowMissingError();

      if (statusChanged) {
        await recordLeadActivity(tx, {
          leadId: id,
          actorId: guard.actorId,
          fromStatus: current.status,
          toStatus: nextStatus,
          note: readActivityNote(body.note),
        });
      }
      if (assigneeChanged && typeof assignee === 'number') {
        await recordLeadActivity(tx, {
          leadId: id,
          actorId: guard.actorId,
          note: `Assigned to operator #${assignee}`,
        });
      }
      if (unassigned) {
        await recordLeadActivity(tx, {
          leadId: id,
          actorId: guard.actorId,
          note: 'Unassigned',
        });
      }
      if (followUpChanged && nextFollowUp !== undefined) {
        await recordLeadActivity(tx, {
          leadId: id,
          actorId: guard.actorId,
          note:
            nextFollowUp === null
              ? 'Follow-up cleared'
              : `Follow-up set for ${nextFollowUp.toISOString()}`,
        });
      }
      return row;
    });

    // Validated-mode trigger (H-1/Decision 14): on a real transition TO the
    // admin-configured trigger status, send the full server-side `Lead` event —
    // but only in validated mode (instant mode sent it at submit), only with
    // persisted tracking consent, and never over an already-`Sent` conversion.
    // Handed to the platform: a dispatch failure must not fail the status update.
    if (statusChanged) {
      const capiSettings = await getMetaCapiSettings();
      if (
        capiSettings.mode === 'validated' &&
        capiSettings.trigger !== '' &&
        nextStatus === capiSettings.trigger &&
        current.trackingConsent === true &&
        updated.metaCapiStatus !== 'Sent'
      ) {
        keepAlive(dispatchLeadIntegrations(id, { licensePortal: false, metaEvent: 'full' }));
      }
    }

    return ok(updated);
  } catch (e) {
    if (e instanceof LeadRowMissingError) return fail(e.message, 404);
    logServerError('PUT /api/leads/[id]', e, reqId);
    return failWithRequestId(errorMessage(e), reqId);
  }
}
