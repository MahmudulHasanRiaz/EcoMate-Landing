CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	CONSTRAINT "social_links_platform_valid" CHECK ("social_links"."platform" IN ('facebook', 'youtube', 'linkedin', 'tiktok', 'instagram', 'x', 'whatsapp'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_links_platform_idx" ON "social_links" USING btree ("platform");