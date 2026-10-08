ALTER TABLE "leads" ADD COLUMN "tracking_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "meta_capi_mode" text DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "meta_lead_status_trigger" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "meta_instant_event_name" text DEFAULT 'LeadInitiated' NOT NULL;--> statement-breakpoint
-- Backfill (H-1): under the pre-2b logic only cookie-accepted leads left 'Skipped',
-- so a non-Skipped status is a faithful record of tracking consent at submit time.
UPDATE "leads" SET "tracking_consent" = ("meta_capi_status" <> 'Skipped') WHERE "tracking_consent" = false;