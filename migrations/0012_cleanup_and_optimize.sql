-- Fix boolean field types and constraints
ALTER TABLE "emails" 
  ALTER COLUMN "is_read" TYPE boolean 
  USING CASE 
    WHEN is_read = 'true' THEN true 
    WHEN is_read = 'false' THEN false
    ELSE false
  END;

ALTER TABLE "offers" 
  ALTER COLUMN "include_vat" TYPE boolean 
  USING CASE 
    WHEN include_vat = 'true' THEN true 
    WHEN include_vat = 'false' THEN false
    ELSE false
  END;

-- Add length constraints to text fields
ALTER TABLE "emails" 
  ADD CONSTRAINT "emails_subject_length" CHECK (length(subject) <= 255),
  ADD CONSTRAINT "emails_body_length" CHECK (length(body) <= 65535);

ALTER TABLE "clients" 
  ADD CONSTRAINT "clients_name_length" CHECK (length(name) <= 255),
  ADD CONSTRAINT "clients_email_length" CHECK (length(email) <= 255),
  ADD CONSTRAINT "clients_phone_length" CHECK (length(phone) <= 50);

ALTER TABLE "products" 
  ADD CONSTRAINT "products_name_length" CHECK (length(name) <= 255),
  ADD CONSTRAINT "products_sku_length" CHECK (length(sku) <= 50);

-- Add missing indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_clients_email" ON "clients" ("email");
CREATE INDEX IF NOT EXISTS "idx_clients_name" ON "clients" ("name");
CREATE INDEX IF NOT EXISTS "idx_products_name" ON "products" ("name");
CREATE INDEX IF NOT EXISTS "idx_offers_client_status" ON "offers" ("client_id", "status");

-- Add text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_products_name_trgm" ON "products" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_clients_name_trgm" ON "clients" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_emails_subject_trgm" ON "emails" USING gin (subject gin_trgm_ops);

-- Remove redundant indexes (after analyzing query patterns)
DROP INDEX IF EXISTS "idx_offers_currency_amount"; -- Covered by idx_offers_currency_status
DROP INDEX IF EXISTS "offers_currency_idx"; -- Redundant with composite indexes

-- Analyze tables after changes
ANALYZE "emails";
ANALYZE "offers";
ANALYZE "clients";
ANALYZE "products";
