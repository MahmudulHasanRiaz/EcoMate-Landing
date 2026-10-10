ALTER TABLE "blog_posts" ADD COLUMN "video_url" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "gallery_urls" jsonb DEFAULT '[]'::jsonb;