/**
 * Slug generation for admin-typed titles (blog posts, case studies, pricing tiers).
 *
 * Bangla titles have no ASCII form, so the common letters are transliterated and anything
 * unmapped is dropped — a stable slug is preferable to an empty one, and the admin form
 * keeps a read-only slug field with an explicit override for the cases where an English
 * slug reads better (which it usually does).
 *
 * Deliberately deterministic: this function never uses `Date.now()` or randomness. The
 * same title must always produce the same slug, or re-running a seed or a retried request
 * would mint a second URL for the same content. Uniqueness is the caller's job (the DB
 * enforces it with a partial unique index on live slugs).
 */

const BANGLA_TO_ASCII: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'উ': 'u', 'এ': 'e', 'ক': 'k', 'গ': 'g', 'চ': 'c',
  'জ': 'j', 'ট': 't', 'ড': 'd', 'ত': 't', 'দ': 'd', 'ন': 'n', 'প': 'p', 'ব': 'b',
  'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'স': 's', 'হ': 'h', 'া': 'a',
  'ি': 'i', 'ী': 'i', 'ু': 'u', 'ে': 'e', 'ো': 'o', 'ৌ': 'o', ' ': '-',
};

export function slugify(input: string): string {
  const ascii = [...input.toLowerCase()]
    .map((ch) => BANGLA_TO_ASCII[ch] ?? (/[a-z0-9]/.test(ch) ? ch : /\s/.test(ch) ? '-' : ''))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii || 'post';
}

/**
 * Suffix helper for the second, third, ... content item that wants the same slug.
 * `attempt` is 1-based, so `slugWithSuffix('hero', 1) === 'hero'`.
 */
export function slugWithSuffix(slug: string, attempt: number): string {
  return attempt <= 1 ? slug : `${slug}-${attempt}`;
}
