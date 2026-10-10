/**
 * Drop every key the schema does not declare, before `safeParse`.
 *
 * Admin forms round-trip GET-shaped rows (id, createdAt, updatedAt, …) back
 * through PUT handlers whose schemas are strict objects: without stripping,
 * every edit of a fetched row fails validation with "validation failed" even
 * though the operator changed nothing illegitimate. Stripping here keeps the
 * mass-assignment guarantee (only declared keys can ever reach `.set()` —
 * `id`/`createdAt` can never be written) while making row round-trips work.
 *
 * The schemas stay strict: unknown keys are still rejected at the schema
 * level (see `tests/validation/*`), so a direct API caller sending garbage
 * alongside valid fields gets the garbage silently dropped rather than a 400.
 * That leniency is deliberate for operator-driven CMS writes; machine clients
 * that need strictness should validate client-side.
 *
 * The parameter is structural (any object schema with `keyof()`), so local
 * `.extend()`ed schemas work too — not just the shared strict ones.
 */
interface KeyofSchema {
  keyof(): { options: readonly (string | number)[] };
}

export function stripUnknownKeys(schema: KeyofSchema, body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body;
  const allowed = new Set<string>(
    schema.keyof().options.map((option) => String(option)),
  );
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}
