-- Add contact_person column to clients if it doesn't exist
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contact_person" text;

-- Add currency and exchange_rate columns to offers if they don't exist
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'EUR';
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(10, 4) NOT NULL DEFAULT 4.3500;

-- Add check constraint for valid currencies
DO $$ BEGIN
  ALTER TABLE "offers" ADD CONSTRAINT "offers_currency_check" 
    CHECK (currency IN ('EUR', 'PLN'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index on currency column
CREATE INDEX IF NOT EXISTS "offers_currency_idx" ON "offers" ("currency");
