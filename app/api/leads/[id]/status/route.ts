import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  logServerError,
  ok,
  optionalString,
  parseId,
} from '@/lib/json';

// Mirrors the `leads.status` lifecycle in db/schema.ts. Validating against the real set
// keeps the admin Kanban from writing a status the UI can never render.
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost'] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid lead id', 400);

    const body = asObject(await req.json());
    if (!isLeadStatus(body.status)) {
      return fail(`status must be one of: ${LEAD_STATUSES.join(', ')}`, 400);
    }

    // `internalNotes: undefined` is dropped by Drizzle, so a status-only update does not
    // blank existing notes.
    const [updated] = await getDb()
      .update(leadsTable)
      .set({
        status: body.status,
        internalNotes: optionalString(body.internalNotes),
        updatedAt: new Date(),
      })
      .where(eq(leadsTable.id, id))
      .returning();
    if (!updated) return fail('Lead not found', 404);
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/leads/[id]/status', e);
    return fail(errorMessage(e));
  }
}
