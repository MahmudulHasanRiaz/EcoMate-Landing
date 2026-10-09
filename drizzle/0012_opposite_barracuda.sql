ALTER TABLE "media_assets" ADD COLUMN "mime_type" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "size_bytes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "uploaded_by" integer;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_admin_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_category_idx" ON "media_assets" USING btree ("category");