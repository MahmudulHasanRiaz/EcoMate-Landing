import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogTagsTable } from '@/db/schema';
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
import { slugify, slugWithSuffix } from '@/lib/slug';
import { blogTagCreate, stripUnknownKeys } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const rows = await getDb()
      .select()
      .from(blogTagsTable)
      .orderBy(asc(blogTagsTable.name));

    return ok(rows);
  } catch (e) {
    logServerError('GET /api/blog/tags', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

async function resolveTagSlug(name: string, preferred?: string): Promise<string | null> {
  const wanted = (preferred ?? '').trim();
  const db = getDb();
  if (wanted !== '') {
    const [existing] = await db
      .select({ id: blogTagsTable.id })
      .from(blogTagsTable)
      .where(eq(blogTagsTable.slug, wanted))
      .limit(1);
    return existing ? null : wanted;
  }
  const base = slugify(name).slice(0, 50).replace(/-+$/g, '') || 'tag';
  for (let attempt = 1; attempt <= 50; attempt++) {
    const candidate = slugWithSuffix(base, attempt);
    if (!/^[a-z0-9-]{2,60}$/.test(candidate)) continue;
    const [existing] = await db
      .select({ id: blogTagsTable.id })
      .from(blogTagsTable)
      .where(eq(blogTagsTable.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return null;
}

export async function POST(req: Request) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = blogTagCreate.safeParse(
      stripUnknownKeys(blogTagCreate, await req.json().catch(() => null)),
    );
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const { name, description, slug: preferredSlug } = parsed.data;

    const slug = await resolveTagSlug(name, preferredSlug);
    if (!slug) {
      return fail(
        (preferredSlug ?? '').trim() !== ''
          ? 'A tag with that slug already exists'
          : 'Could not derive a unique slug for this tag name',
        409,
      );
    }

    const [created] = await getDb()
      .insert(blogTagsTable)
      .values({
        name,
        slug,
        description: description ?? '',
      })
      .returning();

    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/blog/tags', e, requestId(req));
    if (isUniqueViolation(e)) return fail('A tag with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}
