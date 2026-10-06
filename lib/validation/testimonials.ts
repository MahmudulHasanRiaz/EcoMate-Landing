import { z } from 'zod';

const urlOrEmpty = z.union([z.url(), z.literal('')]);
const metric = z.strictObject({
  label: z.string().max(120),
  stat: z.string().max(120),
});

const base = {
  clientName: z.string().min(1).max(200),
  clientRole: z.string().max(200),
  companyName: z.string().min(1).max(200),
  category: z.string().max(120),
  location: z.string().max(200),
  quoteEn: z.string().min(1).max(5000),
  quoteBn: z.string().min(1).max(5000),
  websiteUrl: urlOrEmpty,
  logoUrl: urlOrEmpty,
  videoUrl: urlOrEmpty,
  videoDuration: z.string().max(40),
  format: z.string().max(60),
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
  format: base.format.optional(),
  metrics: base.metrics.optional(),
  sortOrder: base.sortOrder.optional(),
  isPublished: base.isPublished.optional(),
});
