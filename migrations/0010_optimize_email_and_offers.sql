-- Change is_read column type from TEXT to BOOLEAN
ALTER TABLE "emails" 
  ALTER COLUMN "is_read" TYPE boolean USING CASE 
    WHEN is_read = 'true' THEN true 
    ELSE false 
  END;

-- Add indexes for email search and filtering
CREATE INDEX IF NOT EXISTS "idx_emails_subject_search" ON "emails" USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS "idx_emails_body_search" ON "emails" USING gin(to_tsvector('english', body));
CREATE INDEX IF NOT EXISTS "idx_emails_from_to" ON "emails" ("from_email", "to_email");
CREATE INDEX IF NOT EXISTS "idx_emails_status_read" ON "emails" ("status", "is_read");

-- Add partial index for unread emails
CREATE INDEX IF NOT EXISTS "idx_unread_emails" ON "emails" ("created_at") 
WHERE NOT "is_read";

-- Add array length check constraint for attachments
ALTER TABLE "emails" ADD CONSTRAINT "emails_attachments_length_check"
  CHECK (array_length(attachments, 1) <= 10);

-- Add composite index for currency-based offer queries
CREATE INDEX IF NOT EXISTS "idx_offers_currency_status" ON "offers" ("currency", "status");
CREATE INDEX IF NOT EXISTS "idx_offers_currency_total" ON "offers" ("currency", "total_amount");

-- Add partial index for active offers in each currency
CREATE INDEX IF NOT EXISTS "idx_active_eur_offers" ON "offers" ("created_at")
WHERE "status" NOT IN ('archived', 'rejected') AND "currency" = 'EUR';

CREATE INDEX IF NOT EXISTS "idx_active_pln_offers" ON "offers" ("created_at")
WHERE "status" NOT IN ('archived', 'rejected') AND "currency" = 'PLN';

-- Add text search capabilities to offers
CREATE INDEX IF NOT EXISTS "idx_offers_title_search" ON "offers" USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS "idx_offers_notes_search" ON "offers" USING gin(to_tsvector('english', notes));

-- Analyze tables for query optimization
ANALYZE "emails";
ANALYZE "offers";
