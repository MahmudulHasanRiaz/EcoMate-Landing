import { z } from 'zod';

// The categories the media admin actually uses (see `media_assets.category` and the
// library UI). Anything else is a typo that would strand the asset outside every filter.
export const MEDIA_CATEGORIES = [
  'general',
  'logo',
  'hero',
  'product_ui',
  'customer_logo',
  'og_image',
] as const;

const urlOrEmpty = z.union([z.url(), z.literal('')]);

export const mediaCreate = z.strictObject({
  key: z.string().min(1).max(300),
  title: z.string().min(1).max(200),
  url: z.union([z.url(), z.literal('')]),
  altText: z.string().min(1).max(500),
  category: z.enum(MEDIA_CATEGORIES).optional(),
});

export const mediaUpdate = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  url: urlOrEmpty.optional(),
  // Non-empty when supplied: clearing the label would put an unlabelled image into the
  // library, the same state `mediaCreate` refuses to mint.
  altText: z.string().min(1).max(500).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
  key: z.string().min(1).max(300).optional(),
});

export const mediaUploadMeta = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  altText: z.string().max(500).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
});
