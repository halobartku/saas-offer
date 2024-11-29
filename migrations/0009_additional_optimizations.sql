-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_offers_client_status_date" ON "offers" ("client_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_offer_items_product_quantity" ON "offer_items" ("product_id", "quantity");

-- Add indexes for sorting and filtering
CREATE INDEX IF NOT EXISTS "idx_products_price" ON "products" ("price");
CREATE INDEX IF NOT EXISTS "idx_clients_country_type" ON "clients" ("country_code", "client_type");

-- Add partial indexes for active clients
CREATE INDEX IF NOT EXISTS "idx_active_clients" ON "clients" ("updated_at") 
WHERE "client_type" = 'direct';

-- Add constraints for data integrity
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_name_length_check" 
   CHECK (length(name) >= 3 AND length(name) <= 255);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_country_code_check" 
   CHECK (country_code ~ '^[A-Z]{2}$');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DO $$ BEGIN
 CREATE TRIGGER update_client_modtime
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TRIGGER update_offer_modtime
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TRIGGER update_product_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
