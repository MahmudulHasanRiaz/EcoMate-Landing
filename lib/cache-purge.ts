import { z } from 'zod';

/** Scope accepted by `POST /api/admin/cache/purge`. */
export const purgeScopeSchema = z.enum(['all', 'landing']);

export type PurgeScope = z.infer<typeof purgeScopeSchema>;

// Tag literals are duplicated from `lib/revalidate.ts` on purpose: importing them
// would pull `next/cache` into this module and break vitest resolution (see Task 8).
const LANDING_TAGS = [
  'content:en',
  'content:bn',
  'menus:main:en',
  'menus:main:bn',
  'menus:footer:en',
  'menus:footer:bn',
  'branding',
  'pricing',
  'seo',
] as const;

const ALL_TAGS = [
  ...LANDING_TAGS,
  'blog',
  'social',
  'testimonials',
  'casestudies',
] as const;

/** The exact tag list a scope invalidates. */
export function purgeScopeTags(scope: PurgeScope): string[] {
  return [...(scope === 'all' ? ALL_TAGS : LANDING_TAGS)];
}
