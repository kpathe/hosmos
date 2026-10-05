ALTER TABLE "hostellers" DROP CONSTRAINT "hostellers_username_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_hostellers_username";--> statement-breakpoint
ALTER TABLE "hostellers" ADD COLUMN "name_slug" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostellers_name_slug" ON "hostellers" USING btree ("name_slug");--> statement-breakpoint
ALTER TABLE "hostellers" DROP COLUMN IF EXISTS "username";--> statement-breakpoint
ALTER TABLE "hostellers" ADD CONSTRAINT "hostellers_name_slug_unique" UNIQUE("name_slug");