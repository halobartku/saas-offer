-- Add composite indexes for frequently joined columns
CREATE INDEX IF NOT EXISTS "idx_offer_items_offer_product" ON "offer_items" ("offer_id", "product_id");

-- Add index for offer status and created_at for faster filtering and sorting
CREATE INDEX IF NOT EXISTS "idx_offers_status_created" ON "offers" ("status", "created_at");

-- Add index for total amount calculations
CREATE INDEX IF NOT EXISTS "idx_offer_items_price_quantity" ON "offer_items" ("unit_price", "quantity");

-- Add partial index for active offers
CREATE INDEX IF NOT EXISTS "idx_active_offers" ON "offers" ("created_at")
WHERE status IN ('sent', 'accepted');

-- Add index for offer items counting
CREATE INDEX IF NOT EXISTS "idx_offer_items_count" ON "offer_items" ("offer_id")
INCLUDE ("quantity");
