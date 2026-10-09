import { z } from 'zod';
import { MAX_UPLOAD_BYTES, MEDIA_KEY_PATTERN } from '@/lib/media';

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

/**
 * Presign request (Phase 3b Item 17): the client declares what it is about to PUT.
 * `contentType` is an allowlist enum (not free text) and becomes a SIGNED header —
 * the browser must send exactly this type or R2 403s. `size` is advisory (R2 does
 * not enforce it presign-side); the confirm step checks the real object size.
 */
export const mediaSignRequest = z.strictObject({
  filename: z.string().min(1).max(160),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  title: z.string().min(1).max(200).optional(),
  altText: z.string().max(500).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
});

/**
 * Confirm request: the browser finished its direct-to-R2 PUT and the backend now
 * verifies (object exists, size within cap, magic bytes match an image type) before
 * minting the library row. `key` must match the keys the backend itself mints —
 * a client-invented key can never confirm.
 */
export const mediaConfirmRequest = z.strictObject({
  key: z.string().regex(MEDIA_KEY_PATTERN),
  title: z.string().min(1).max(200),
  altText: z.string().min(1).max(500),
  category: z.enum(MEDIA_CATEGORIES).optional(),
});
