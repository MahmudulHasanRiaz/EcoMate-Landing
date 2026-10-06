import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingSectionsTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { sectionUpdate } from '@/lib/validation';

// Next 16: `params` is a Promise in route handlers. Never destructure it synchronously.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid section id', 400);

    // `section_key` is intentionally NOT writable — it is the stable identifier that
    // content rows, admin order and the landing page all key off. The strict schema
    // rejects it (and any other unknown key) rather than silently dropping it.
    const parsed = sectionUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const [updated] = await getDb()
      .update(landingSectionsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(landingSectionsTable.id, id))
      .returning();
    if (!updated) return fail('Section not found', 404);
    // A section edit changes both language variants, so both content tags go. Invalidating
    // only the edited locale would leave the other language serving the stale title.
    invalidateDomains('content', 'en');
    invalidateDomains('content', 'bn');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/sections/[id]', e);
    return fail(errorMessage(e));
  }
}
