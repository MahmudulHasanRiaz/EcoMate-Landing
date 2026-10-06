CREATE TABLE "content_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_key" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"actor_id" integer,
	"note" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_revisions_status_valid" CHECK ("content_revisions"."status" IN ('draft', 'published')),
	CONSTRAINT "content_revisions_version_positive" CHECK ("content_revisions"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_revisions_entity_key_version_idx" ON "content_revisions" USING btree ("entity","entity_key","version");