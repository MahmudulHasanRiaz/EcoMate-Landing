CREATE TABLE "dispatch_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"lead_id" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text DEFAULT '',
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dispatch_queue_status_valid" CHECK ("dispatch_queue"."status" IN ('Pending', 'Retrying', 'Done', 'Failed'))
);
--> statement-breakpoint
ALTER TABLE "dispatch_queue" ADD CONSTRAINT "dispatch_queue_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispatch_queue_due_idx" ON "dispatch_queue" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "dispatch_queue_lead_idx" ON "dispatch_queue" USING btree ("lead_id");