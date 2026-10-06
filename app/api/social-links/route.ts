/**
 * /api/social-links — footer/contact social profiles.
 *
 * GET is public and ordered; POST/PUT/DELETE are admin mutations (proxy.ts gates mutating
 * methods). Every field is validated by a strict schema: the body never reaches
 * `.values()`/`.set()` whole.
 */
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { socialLinksTable } from '@/db/schema';
import {
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { socialLinkCreate, socialLinkUpdate } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const visibleOnly = new URL(req.url).searchParams.get('visible') === 'true';
    const rows = await getDb()
      .select()
      .from(socialLinksTable)
      .where(visibleOnly ? eq(socialLinksTable.isVisible, true) : undefined)
      .orderBy(asc(socialLinksTable.sortOrder), asc(socialLinksTable.id));
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/social-links', e);
    return fail(errorMessage(e));
  }
}

export async function POST(req: Request) {
  try {
    const parsed = socialLinkCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const [created] = await getDb()
      .insert(socialLinksTable)
      .values({
        platform: parsed.data.platform,
        url: parsed.data.url ?? '',
        sortOrder: parsed.data.sortOrder ?? 0,
        isVisible: parsed.data.isVisible ?? true,
      })
      .returning();
    invalidateDomains('social');
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/social-links', e);
    if (isUniqueViolation(e)) return fail('That platform already has a link row', 409);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = socialLinkUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { id, ...fields } = parsed.data;
    if (Object.values(fields).every((value) => value === undefined)) {
      return fail('Nothing to update', 400);
    }

    const [updated] = await getDb()
      .update(socialLinksTable)
      .set(fields)
      .where(eq(socialLinksTable.id, id))
      .returning();
    if (!updated) return fail('Social link not found', 404);
    invalidateDomains('social');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/social-links', e);
    if (isUniqueViolation(e)) return fail('That platform already has a link row', 409);
    return fail(errorMessage(e));
  }
}

export async function DELETE(req: Request) {
  try {
    const id = parseId(new URL(req.url).searchParams.get('id') ?? '');
    if (id === null) return fail('id query parameter is required', 400);
    const [deleted] = await getDb()
      .delete(socialLinksTable)
      .where(eq(socialLinksTable.id, id))
      .returning({ id: socialLinksTable.id });
    if (!deleted) return fail('Social link not found', 404);
    invalidateDomains('social');
    return ok({ success: true, id: deleted.id });
  } catch (e) {
    logServerError('DELETE /api/social-links', e);
    return fail(errorMessage(e));
  }
}
