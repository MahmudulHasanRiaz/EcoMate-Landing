import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);
const urlOrEmpty = z.union([z.url(), z.literal('')]);
const metric = z.strictObject({
  label: z.string().max(120),
  stat: z.string().max(120),
});

const base = {
  slug,
  title: z.string().min(1).max(200),
  client: z.string().min(1).max(200),
  businessType: z.string().max(120),
  problemOverview: z.string().min(1).max(10_000),
  solutionImplemented: z.string().min(1).max(10_000),
  quantifiedOutcome: z.string().min(1).max(5000),
  metrics: z.array(metric).max(20),
  featuredImageUrl: urlOrEmpty,
  videoUrl: urlOrEmpty,
  websiteUrl: urlOrEmpty,
  isPublished: z.boolean(),
  seoTitle: z.string().max(70),
  seoDescription: z.string().max(200),
};

export const caseStudyCreate = z.strictObject({
  // Optional: omitted when the admin leaves slug generation to the route, which derives
  // it from the title (post-name permalink) and guarantees uniqueness.
  slug: base.slug.optional(),
  title: base.title,
  client: base.client,
  businessType: base.businessType.optional(),
  problemOverview: base.problemOverview,
  solutionImplemented: base.solutionImplemented,
  quantifiedOutcome: base.quantifiedOutcome,
  metrics: base.metrics.optional(),
  featuredImageUrl: base.featuredImageUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  websiteUrl: base.websiteUrl.optional(),
  isPublished: base.isPublished.optional(),
  seoTitle: base.seoTitle.optional(),
  seoDescription: base.seoDescription.optional(),
});

export const caseStudyUpdate = z.strictObject({
  title: base.title.optional(),
  client: base.client.optional(),
  businessType: base.businessType.optional(),
  problemOverview: base.problemOverview.optional(),
  solutionImplemented: base.solutionImplemented.optional(),
  quantifiedOutcome: base.quantifiedOutcome.optional(),
  metrics: base.metrics.optional(),
  featuredImageUrl: base.featuredImageUrl.optional(),
  videoUrl: base.videoUrl.optional(),
  websiteUrl: base.websiteUrl.optional(),
  isPublished: base.isPublished.optional(),
  seoTitle: base.seoTitle.optional(),
  seoDescription: base.seoDescription.optional(),
});
