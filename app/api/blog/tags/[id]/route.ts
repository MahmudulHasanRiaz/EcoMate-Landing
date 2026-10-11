import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogTagsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { slugify } from '@/lib/slug';
import { blogTagUpdate, stripUnknownKeys } from '@/lib/validation';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid tag id', 400);

    const [tag] = await getDb()
      .select()
      .from(blogTagsTable)
      .where(eq(blogTagsTable.id, id))
      .limit(1);

    if (!tag) return fail('Tag not found', 404);
    return ok(tag);
  } catch (e) {
    logServerError('GET /api/blog/tags/[id]', e);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid tag id', 400);

    const [existing] = await getDb()
      .select()
      .from(blogTagsTable)
      .where(eq(blogTagsTable.id, id))
      .limit(1);
    if (!existing) return fail('Tag not found', 404);

    const parsed = blogTagUpdate.safeParse(
      stripUnknownKeys(blogTagUpdate, await req.json().catch(() => null)),
    );
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const { name, nameBn, description, descriptionBn, slug: newSlug } = parsed.data;

    let finalSlug: string | undefined = undefined;
    if (newSlug && newSlug !== existing.slug) {
      finalSlug = newSlug;
    } else if (name && !newSlug && name !== existing.name) {
      finalSlug = slugify(name);
    }

    const [updated] = await getDb()
      .update(blogTagsTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(nameBn !== undefined ? { nameBn } : {}),
        ...(finalSlug !== undefined ? { slug: finalSlug } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(descriptionBn !== undefined ? { descriptionBn } : {}),
      })
      .where(eq(blogTagsTable.id, id))
      .returning();

    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/blog/tags/[id]', e);
    if (isUniqueViolation(e)) return fail('A tag with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid tag id', 400);

    const [deleted] = await getDb()
      .delete(blogTagsTable)
      .where(eq(blogTagsTable.id, id))
      .returning();

    if (!deleted) return fail('Tag not found', 404);
    return ok({ deleted: true, id });
  } catch (e) {
    logServerError('DELETE /api/blog/tags/[id]', e);
    return fail(errorMessage(e));
  }
}
