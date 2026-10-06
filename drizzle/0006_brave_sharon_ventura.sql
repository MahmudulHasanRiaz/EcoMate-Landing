CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"actor_id" integer,
	"from_status" text DEFAULT '',
	"to_status" text DEFAULT '',
	"note" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_to_id" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "follow_up_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "anonymized_at" timestamp;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_activities_lead_created_idx" ON "lead_activities" USING btree ("lead_id","created_at");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_admin_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_posts_publish_order_idx" ON "blog_posts" USING btree (coalesce("published_at", "created_at"));--> statement-breakpoint
CREATE INDEX "integration_logs_created_at_idx" ON "integration_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_created_idx" ON "leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "leads_follow_up_at_idx" ON "leads" USING btree ("follow_up_at");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "testimonials_sort_order_idx" ON "testimonials" USING btree ("sort_order");