ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "thread_id" uuid;
ALTER TABLE "emails" ADD COLUMN IF NOT EXISTS "parent_id" uuid;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_parent_id_emails_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."emails"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_thread_id" ON "emails" ("thread_id");
CREATE INDEX IF NOT EXISTS "idx_emails_parent_id" ON "emails" ("parent_id");
