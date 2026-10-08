import { z } from 'zod';

const urlOrEmpty = z.union([z.url(), z.literal('')]);
const metric = z.strictObject({
  label: z.string().max(120),
  stat: z.string().max(120),
});

/**
 * Testimonial formats (H-19/Decision 11): short-form video, standard/YouTube video,
 * image testimonial, text (+image logo) card. Writes accept exactly these; legacy
 * rows (`video_walkthrough`, …) keep rendering defensively but must pick a valid
 * format on their next edit.
 */
export const testimonialFormat = z.enum(['video_short', 'video_standard', 'image', 'text']);
export type TestimonialFormat = z.infer<typeof testimonialFormat>;

export const videoProvider = z.enum(['youtube', 'upload']);

const base = {
  clientName: z.string().min(1).max(200),
  clientRole: z.string().max(200),
  companyName: z.string().min(1).max(200),
  category: z.string().max(120),
  location: z.string().max(200),
  quoteEn: z.string().min(1).max(5000),
  quoteBn: z.string().max(5000),
  websiteUrl: urlOrEmpty,
  logoUrl: urlOrEmpty,
  videoUrl: urlOrEmpty,
  videoDuration: z.string().max(40),
  videoProvider,
  imageUrl: urlOrEmpty,
  rating: z.number().int().min(1).max(5),
  format: testimonialFormat,
  metrics: z.array(metric).max(20),
  sortOrder: z.number().int().min(0).max(10_000),
  isPublished: z.boolean(),
};

export const testimonialCreate = z.strictObject({
  clientName: base.clientName,
  clientRole: base.clientRole.optional(),
  companyName: base.companyName,
  category: base.category.optional(),
  location: base.location.optional(),
  quoteEn: base.quoteEn,
  quoteBn: base.quoteBn.optional(),
  websiteUrl: base.websiteUrl.optional(),
  logoUrl: base.logoUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  videoDuration: base.videoDuration.optional(),
  videoProvider: base.videoProvider.optional(),
  imageUrl: base.imageUrl.optional(),
  rating: z.union([base.rating, z.null()]).optional(),
  format: base.format.optional(),
  metrics: base.metrics.optional(),
  sortOrder: base.sortOrder.optional(),
  isPublished: base.isPublished.optional(),
});

export const testimonialUpdate = z.strictObject({
  clientName: base.clientName.optional(),
  clientRole: base.clientRole.optional(),
  companyName: base.companyName.optional(),
  category: base.category.optional(),
  location: base.location.optional(),
  quoteEn: base.quoteEn.optional(),
  quoteBn: base.quoteBn.optional(),
  websiteUrl: base.websiteUrl.optional(),
  logoUrl: base.logoUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  videoDuration: base.videoDuration.optional(),
  videoProvider: base.videoProvider.optional(),
  imageUrl: base.imageUrl.optional(),
  rating: z.union([base.rating, z.null()]).optional(),
  format: base.format.optional(),
  metrics: base.metrics.optional(),
  sortOrder: base.sortOrder.optional(),
  isPublished: base.isPublished.optional(),
});

export interface FormatRequirementInput {
  format?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  quoteEn?: string | null;
}

/**
 * Per-format required fields (H-19c), checked against the MERGED row (existing row +
 * patch), not the patch alone: clearing `videoUrl` on a `video_standard` row must fail
 * even though `videoUrl` is patch-optional. Returns the rejection reason, or null when
 * the combination is renderable.
 */
export function formatRequirements(input: FormatRequirementInput): string | null {
  const format = (input.format ?? 'text').trim();
  const has = (value: string | null | undefined): boolean =>
    typeof value === 'string' && value.trim() !== '';
  switch (format) {
    case 'video_short':
    case 'video_standard':
    case 'video_walkthrough':
      // Legacy `video_walkthrough` rows predate the enum: they carry a videoUrl and
      // render as standard until an edit migrates them onto a valid format value.
      if (!has(input.videoUrl)) return `format "${format}" requires a non-empty videoUrl`;
      return null;
    case 'image':
      if (!has(input.imageUrl)) return 'format "image" requires a non-empty imageUrl';
      return null;
    case 'text':
      if (!has(input.quoteEn)) return 'format "text" requires a non-empty quote';
      return null;
    default:
      return `unknown format "${format}" — expected video_short, video_standard, image or text`;
  }
}
