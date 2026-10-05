import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingSectionsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  logServerError,
  ok,
  optionalBoolean,
  optionalObject,
  optionalString,
  parseId,
  readNumber,
} from '@/lib/json';

// Next 16: `params` is a Promise in route handlers. Never destructure it synchronously.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid section id', 400);

    // Allowlisted update: `section_key` is intentionally NOT writable — it is the stable
    // identifier that content rows, admin order and the landing page all key off.
    const body = asObject(await req.json());
    const patch = {
      titleEn: optionalString(body.titleEn),
      titleBn: optionalString(body.titleBn),
      subtitleEn: optionalString(body.subtitleEn),
      subtitleBn: optionalString(body.subtitleBn),
      eyebrowEn: optionalString(body.eyebrowEn),
      eyebrowBn: optionalString(body.eyebrowBn),
      sortOrder: body.sortOrder === undefined ? undefined : readNumber(body.sortOrder, 0),
      isVisible: optionalBoolean(body.isVisible),
      customConfig: optionalObject(body.customConfig),
      updatedAt: new Date(),
    };

    const [updated] = await getDb()
      .update(landingSectionsTable)
      .set(patch)
      .where(eq(landingSectionsTable.id, id))
      .returning();
    if (!updated) return fail('Section not found', 404);
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/sections/[id]', e);
    return fail(errorMessage(e));
  }
}
