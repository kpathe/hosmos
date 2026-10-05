ALTER TABLE "hostels" ADD COLUMN "slug" text DEFAULT md5(random()::text) NOT NULL;--> statement-breakpoint
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "hostels" ALTER COLUMN "slug" DROP DEFAULT;