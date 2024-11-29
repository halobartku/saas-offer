-- Fix the is_read column type in emails table
ALTER TABLE "emails" 
  ALTER COLUMN "is_read" TYPE boolean 
  USING CASE 
    WHEN is_read = 'true' THEN true 
    WHEN is_read = 'false' THEN false
    ELSE false
  END;

-- Add NOT NULL constraint after conversion
ALTER TABLE "emails" 
  ALTER COLUMN "is_read" SET NOT NULL,
  ALTER COLUMN "is_read" SET DEFAULT false;

-- Add constraint for valid email status values
DO $$ BEGIN
  ALTER TABLE "emails" ADD CONSTRAINT "emails_status_check" 
    CHECK (status IN ('inbox', 'sent', 'draft', 'archived', 'trash'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add constraint for email subject length
DO $$ BEGIN
  ALTER TABLE "emails" ADD CONSTRAINT "emails_subject_length_check"
    CHECK (length(subject) > 0 AND length(subject) <= 255);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Convert include_vat in offers table to boolean
ALTER TABLE "offers"
  ALTER COLUMN "include_vat" TYPE boolean
  USING CASE
    WHEN include_vat = 'true' THEN true
    WHEN include_vat = 'false' THEN false
    ELSE false
  END;

-- Add NOT NULL constraint after conversion
ALTER TABLE "offers"
  ALTER COLUMN "include_vat" SET NOT NULL,
  ALTER COLUMN "include_vat" SET DEFAULT false;

-- Analyze tables after changes
ANALYZE "emails";
ANALYZE "offers";
