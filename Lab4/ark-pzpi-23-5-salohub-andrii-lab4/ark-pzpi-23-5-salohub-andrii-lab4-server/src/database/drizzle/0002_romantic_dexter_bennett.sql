ALTER TABLE "system_analytics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "system_analytics" CASCADE;--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;