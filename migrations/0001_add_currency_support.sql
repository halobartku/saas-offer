ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'EUR';
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(10, 4) NOT NULL DEFAULT 4.3;

-- Add check constraint for valid currencies
DO $$ BEGIN
 ALTER TABLE "offers" ADD CONSTRAINT "offers_currency_check" 
   CHECK (currency IN ('EUR', 'PLN'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
