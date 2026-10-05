CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"author" text DEFAULT 'EcoMate Engineering Team' NOT NULL,
	"category" text DEFAULT 'Operations & Fulfillment' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"featured_image_url" text DEFAULT '',
	"read_time" text DEFAULT '5 min read',
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text DEFAULT '',
	"seo_description" text DEFAULT '',
	"canonical_url" text DEFAULT '',
	"deleted_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_status_valid" CHECK ("blog_posts"."status" IN ('draft', 'scheduled', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"client" text NOT NULL,
	"business_type" text NOT NULL,
	"problem_overview" text NOT NULL,
	"solution_implemented" text NOT NULL,
	"quantified_outcome" text NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb,
	"featured_image_url" text DEFAULT '',
	"video_url" text DEFAULT '',
	"website_url" text DEFAULT '',
	"is_published" boolean DEFAULT true NOT NULL,
	"seo_title" text DEFAULT '',
	"seo_description" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_name" text DEFAULT 'LicensePortal' NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"response" jsonb DEFAULT '{}'::jsonb,
	"status" text NOT NULL,
	"error_message" text DEFAULT '',
	"attempts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_key" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landing_content_status_valid" CHECK ("landing_content"."status" IN ('draft', 'published')),
	CONSTRAINT "landing_content_version_positive" CHECK ("landing_content"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "landing_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_key" text NOT NULL,
	"title_en" text NOT NULL,
	"title_bn" text NOT NULL,
	"subtitle_en" text DEFAULT '',
	"subtitle_bn" text DEFAULT '',
	"eyebrow_en" text DEFAULT '',
	"eyebrow_bn" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"custom_config" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landing_sections_section_key_unique" UNIQUE("section_key")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '',
	"daily_volume" text DEFAULT '150 – 500 orders / day',
	"note" text DEFAULT '',
	"source" text DEFAULT 'landing_page_lead_form',
	"utm_source" text DEFAULT '',
	"utm_campaign" text DEFAULT '',
	"status" text DEFAULT 'New' NOT NULL,
	"assigned_to" text DEFAULT 'Unassigned',
	"internal_notes" text DEFAULT '',
	"license_portal_status" text DEFAULT 'Pending' NOT NULL,
	"license_portal_error" text DEFAULT '',
	"license_portal_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text DEFAULT '',
	"category" text DEFAULT 'general' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"tier_subtitle_en" text NOT NULL,
	"tier_subtitle_bn" text NOT NULL,
	"monthly_price" integer NOT NULL,
	"annual_price" integer NOT NULL,
	"currency" text DEFAULT '৳' NOT NULL,
	"order_volume" text NOT NULL,
	"users_included" text NOT NULL,
	"showrooms_included" text NOT NULL,
	"features_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features_bn" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_features_en" jsonb DEFAULT '[]'::jsonb,
	"cta_label_en" text DEFAULT 'Start with this tier' NOT NULL,
	"cta_label_bn" text DEFAULT 'এই প্ল্যানে শুরু করুন' NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_plans_slug_unique" UNIQUE("slug"),
	CONSTRAINT "pricing_plans_monthly_price_non_negative" CHECK ("pricing_plans"."monthly_price" >= 0),
	CONSTRAINT "pricing_plans_annual_price_non_negative" CHECK ("pricing_plans"."annual_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'EcoMate' NOT NULL,
	"tagline" text DEFAULT 'Your Entire E-commerce Operation, Managed From One Place' NOT NULL,
	"logo_url" text DEFAULT '',
	"favicon_url" text DEFAULT '',
	"default_locale" text DEFAULT 'en' NOT NULL,
	"support_phone" text DEFAULT '+880 1894-828290' NOT NULL,
	"support_email" text DEFAULT 'hello@ecomate.app' NOT NULL,
	"whatsapp_number" text DEFAULT '8801894828290' NOT NULL,
	"messenger_url" text DEFAULT 'https://m.me/ecomate.app' NOT NULL,
	"address" text DEFAULT 'Tejgaon I/A, Dhaka 1208, Bangladesh' NOT NULL,
	"is_pricing_visible" boolean DEFAULT true NOT NULL,
	"seo_title" text DEFAULT 'EcoMate — Your Entire E-commerce Operation, Managed From One Place',
	"seo_description" text DEFAULT 'Complete operating platform for high-volume e-commerce brands: multi-store sync, physical showrooms, smart barcode packing, courier COD reconciliation, and ledger.',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"client_role" text NOT NULL,
	"company_name" text NOT NULL,
	"category" text NOT NULL,
	"location" text NOT NULL,
	"quote_en" text NOT NULL,
	"quote_bn" text NOT NULL,
	"website_url" text DEFAULT '',
	"logo_url" text DEFAULT '',
	"video_url" text DEFAULT '',
	"video_duration" text DEFAULT '',
	"format" text DEFAULT 'video_walkthrough' NOT NULL,
	"metrics" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_live_idx" ON "blog_posts" USING btree ("slug") WHERE "blog_posts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "landing_content_section_locale_idx" ON "landing_content" USING btree ("section_key","locale");