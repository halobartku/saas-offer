-- Execute the migration
BEGIN;

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_offers_status_total" ON "offers" ("status", "total_amount")
WHERE status IN ('sent', 'accepted');

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS "idx_offers_date_range" ON "offers" ("created_at", "valid_until")
WHERE status NOT IN ('archived', 'rejected');

-- Add index for email search
CREATE INDEX IF NOT EXISTS "idx_email_search" ON "emails" ("subject" text_pattern_ops, "created_at")
WHERE status != 'trash';

-- Add index for active clients based on last update
CREATE INDEX IF NOT EXISTS "idx_active_clients" ON "clients" ("updated_at", "id")
WHERE client_type = 'direct';

-- Add data integrity constraints
DO $$ BEGIN
  ALTER TABLE "offers" ADD CONSTRAINT "check_valid_until_future" 
    CHECK (valid_until IS NULL OR valid_until > created_at);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "offer_items" ADD CONSTRAINT "check_total_amount"
    CHECK ((quantity * unit_price) - COALESCE(discount, 0) >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes for offer items performance
CREATE INDEX IF NOT EXISTS "idx_offer_items_calculations" 
ON "offer_items" ("quantity", "unit_price", "discount")
WHERE discount > 0;

-- Add composite index for client search
CREATE INDEX IF NOT EXISTS "idx_clients_search" 
ON "clients" ("name", "email", "vat_number")
WHERE client_type = 'business';

COMMIT;
