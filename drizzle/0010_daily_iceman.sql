ALTER TABLE "testimonials" ALTER COLUMN "format" SET DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "video_provider" text DEFAULT 'youtube' NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "image_url" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "rating" integer;