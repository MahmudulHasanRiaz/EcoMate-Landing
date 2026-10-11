ALTER TABLE "blog_categories" ADD COLUMN "name_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_categories" ADD COLUMN "description_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "title_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "excerpt_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "content_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "seo_title_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "seo_description_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_tags" ADD COLUMN "name_bn" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "blog_tags" ADD COLUMN "description_bn" text DEFAULT '';