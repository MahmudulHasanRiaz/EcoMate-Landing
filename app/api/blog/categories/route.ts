import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogCategoriesTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  failWithRequestId,
  isUniqueViolation,
  logServerError,
  ok,
} from '@/lib/json';
import { requestId } from '@/lib/request';
import { invalidateDomains } from '@/lib/revalidate';
import { slugify, slugWithSuffix } from '@/lib/slug';
import { blogCategoryCreate, stripUnknownKeys } from '@/lib/validation';

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryTreeNode[];
}

function buildCategoryTree(categories: Array<typeof blogCategoriesTable.$inferSelect>): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const item of categories) {
    map.set(item.id, {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      parentId: item.parentId,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      children: [],
    });
  }

  for (const item of categories) {
    const node = map.get(item.id);
    if (!node) continue;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wantsTree = url.searchParams.get('tree') === '1' || url.searchParams.get('tree') === 'true';

    const rows = await getDb()
      .select()
      .from(blogCategoriesTable)
      .orderBy(asc(blogCategoriesTable.sortOrder), asc(blogCategoriesTable.name));

    if (wantsTree) {
      return ok(buildCategoryTree(rows));
    }
    return ok(rows);
  } catch (e) {
    logServerError('GET /api/blog/categories', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

async function resolveCategorySlug(name: string, preferred?: string): Promise<string | null> {
  const wanted = (preferred ?? '').trim();
  const db = getDb();
  if (wanted !== '') {
    const [existing] = await db
      .select({ id: blogCategoriesTable.id })
      .from(blogCategoriesTable)
      .where(eq(blogCategoriesTable.slug, wanted))
      .limit(1);
    return existing ? null : wanted;
  }
  const base = slugify(name).slice(0, 50).replace(/-+$/g, '') || 'category';
  for (let attempt = 1; attempt <= 50; attempt++) {
    const candidate = slugWithSuffix(base, attempt);
    if (!/^[a-z0-9-]{2,60}$/.test(candidate)) continue;
    const [existing] = await db
      .select({ id: blogCategoriesTable.id })
      .from(blogCategoriesTable)
      .where(eq(blogCategoriesTable.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return null;
}

export async function POST(req: Request) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = blogCategoryCreate.safeParse(
      stripUnknownKeys(blogCategoryCreate, await req.json().catch(() => null)),
    );
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const { name, parentId, description, sortOrder, slug: preferredSlug } = parsed.data;

    if (parentId) {
      const [parent] = await getDb()
        .select({ id: blogCategoriesTable.id })
        .from(blogCategoriesTable)
        .where(eq(blogCategoriesTable.id, parentId))
        .limit(1);
      if (!parent) {
        return fail('Parent category not found', 400);
      }
    }

    const slug = await resolveCategorySlug(name, preferredSlug);
    if (!slug) {
      return fail(
        (preferredSlug ?? '').trim() !== ''
          ? 'A category with that slug already exists'
          : 'Could not derive a unique slug for this category name',
        409,
      );
    }

    const [created] = await getDb()
      .insert(blogCategoriesTable)
      .values({
        name,
        slug,
        parentId: parentId ?? null,
        description: description ?? '',
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    invalidateDomains('blog');
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/blog/categories', e, requestId(req));
    if (isUniqueViolation(e)) return fail('A category with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}
