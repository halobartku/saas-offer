-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS "idx_offers_status" ON "offers" ("status");
CREATE INDEX IF NOT EXISTS "idx_offers_client_id_status" ON "offers" ("client_id", "status");
CREATE INDEX IF NOT EXISTS "idx_clients_email" ON "clients" ("email");
CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku");

-- Add constraint for valid status values
DO $$ BEGIN
 ALTER TABLE "offers" ADD CONSTRAINT "offers_status_check" 
   CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add constraint for valid client types
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_type_check" 
   CHECK (client_type IN ('direct', 'partner', 'reseller'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add email format validation
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_email_format_check" 
   CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add VAT number format validation (basic format check)
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "clients_vat_format_check" 
   CHECK (vat_number IS NULL OR vat_number ~ '^[A-Z]{2}[0-9A-Za-z]{2,12}$');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add non-negative price constraint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_price_check" 
   CHECK (price >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add non-negative constraints for offer items
DO $$ BEGIN
 ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_quantity_check" 
   CHECK (quantity > 0);
 ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_unit_price_check" 
   CHECK (unit_price >= 0);
 ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_discount_check" 
   CHECK (discount >= 0 AND discount <= unit_price);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
