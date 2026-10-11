import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogCategoriesTable, blogPostsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { slugify, slugWithSuffix } from '@/lib/slug';
import { blogCategoryUpdate, stripUnknownKeys } from '@/lib/validation';

async function isDescendant(targetParentId: number, categoryId: number): Promise<boolean> {
  let currentId: number | null = targetParentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const [row]: Array<{ parentId: number | null }> = await getDb()
      .select({ parentId: blogCategoriesTable.parentId })
      .from(blogCategoriesTable)
      .where(eq(blogCategoriesTable.id, currentId))
      .limit(1);
    currentId = row?.parentId ?? null;
  }
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    const db = getDb();

    const [category] = id !== null
      ? await db.select().from(blogCategoriesTable).where(eq(blogCategoriesTable.id, id)).limit(1)
      : await db.select().from(blogCategoriesTable).where(eq(blogCategoriesTable.slug, idOrSlug)).limit(1);

    if (!category) return fail('Category not found', 404);
    return ok(category);
  } catch (e) {
    logServerError('GET /api/blog/categories/[idOrSlug]', e);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    if (id === null) return fail('Invalid category id', 400);

    const [existing] = await getDb()
      .select()
      .from(blogCategoriesTable)
      .where(eq(blogCategoriesTable.id, id))
      .limit(1);
    if (!existing) return fail('Category not found', 404);

    const parsed = blogCategoryUpdate.safeParse(
      stripUnknownKeys(blogCategoryUpdate, await req.json().catch(() => null)),
    );
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const { name, parentId, description, sortOrder, slug: newSlug } = parsed.data;

    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) {
        return fail('Category cannot be its own parent', 400);
      }
      const isLoop = await isDescendant(parentId, id);
      if (isLoop) {
        return fail('Cannot set a descendant category as parent (circular reference)', 400);
      }
    }

    let finalSlug: string | undefined = undefined;
    if (newSlug && newSlug !== existing.slug) {
      finalSlug = newSlug;
    } else if (name && !newSlug && name !== existing.name) {
      finalSlug = slugify(name);
    }

    const [updated] = await getDb()
      .update(blogCategoriesTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(finalSlug !== undefined ? { slug: finalSlug } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(blogCategoriesTable.id, id))
      .returning();

    invalidateDomains('blog');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/blog/categories/[idOrSlug]', e);
    if (isUniqueViolation(e)) return fail('A category with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    if (id === null) return fail('Invalid category id', 400);

    const [existing] = await getDb()
      .select()
      .from(blogCategoriesTable)
      .where(eq(blogCategoriesTable.id, id))
      .limit(1);
    if (!existing) return fail('Category not found', 404);

    await getDb().transaction(async (tx) => {
      // Reparent children to this category's parent so sub-tree is not orphaned
      await tx
        .update(blogCategoriesTable)
        .set({ parentId: existing.parentId, updatedAt: new Date() })
        .where(eq(blogCategoriesTable.parentId, id));

      // Detach from blog posts that reference this category
      await tx
        .update(blogPostsTable)
        .set({ categoryId: null })
        .where(eq(blogPostsTable.categoryId, id));

      // Delete the category row
      await tx
        .delete(blogCategoriesTable)
        .where(eq(blogCategoriesTable.id, id));
    });

    invalidateDomains('blog');
    return ok({ deleted: true, id });
  } catch (e) {
    logServerError('DELETE /api/blog/categories/[idOrSlug]', e);
    return fail(errorMessage(e));
  }
}
