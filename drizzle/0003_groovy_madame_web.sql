ALTER TABLE "leads" ADD COLUMN "fbp" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "fbc" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "event_id" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "client_ip" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "user_agent" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "meta_capi_status" text DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "meta_capi_error" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "meta_capi_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_given" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_text" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_consent_recorded_at_consent" CHECK ("leads"."consent_given" = false OR ("leads"."consent_at" IS NOT NULL AND "leads"."consent_text" <> ''));--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_meta_capi_status_valid" CHECK ("leads"."meta_capi_status" IN ('Pending', 'Sent', 'Failed', 'Skipped'));