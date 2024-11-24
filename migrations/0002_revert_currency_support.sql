-- Drop the check constraint first
DO $$ BEGIN
  ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_currency_check";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Drop the columns
ALTER TABLE "offers" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "offers" DROP COLUMN IF EXISTS "exchange_rate";
