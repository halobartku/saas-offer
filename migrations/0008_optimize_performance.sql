-- Add indexes for frequently accessed columns and common query patterns
CREATE INDEX IF NOT EXISTS "idx_clients_created_at" ON "clients" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_offers_valid_until" ON "offers" ("valid_until");
CREATE INDEX IF NOT EXISTS "idx_offers_created_at" ON "offers" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_offer_items_offer_product" ON "offer_items" ("offer_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_emails_created_at" ON "emails" ("created_at");

-- Add indexes for status-based queries with timestamps
CREATE INDEX IF NOT EXISTS "idx_offers_status_created" ON "offers" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_offers_client_created" ON "offers" ("client_id", "created_at");

-- Add partial index for active offers
CREATE INDEX IF NOT EXISTS "idx_active_offers" ON "offers" ("created_at") 
WHERE "status" NOT IN ('archived', 'rejected');

-- Add index for email search
CREATE INDEX IF NOT EXISTS "idx_emails_subject_trgm" ON "emails" USING gin (subject gin_trgm_ops);
