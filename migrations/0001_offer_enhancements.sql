CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#666666',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "offer_tags" (
  "offer_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "offer_tags_pkey" PRIMARY KEY ("offer_id", "tag_id"),
  CONSTRAINT "offer_tags_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE,
  CONSTRAINT "offer_tags_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- Add new columns to offers table for enhanced tracking and reminders
ALTER TABLE "offers" 
  ADD COLUMN IF NOT EXISTS "reminder_date" timestamp,
  ADD COLUMN IF NOT EXISTS "reminder_note" text,
  ADD COLUMN IF NOT EXISTS "follow_up_count" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_status_change" timestamp DEFAULT now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_offers_reminder_date" ON "offers"("reminder_date");
CREATE INDEX IF NOT EXISTS "idx_offers_status" ON "offers"("status");
