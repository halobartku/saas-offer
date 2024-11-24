-- Convert include_vat column from text to boolean
ALTER TABLE "offers" 
  ALTER COLUMN "include_vat" TYPE boolean USING CASE WHEN include_vat = 'true' THEN true ELSE false END,
  ALTER COLUMN "include_vat" SET DEFAULT false;
