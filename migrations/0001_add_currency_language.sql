ALTER TABLE offers 
ADD COLUMN currency text NOT NULL DEFAULT 'EUR',
ADD COLUMN language text NOT NULL DEFAULT 'en';

-- Update existing records to use EUR as currency
UPDATE offers SET currency = 'EUR' WHERE currency IS NULL;

-- Update existing records to use English as language
UPDATE offers SET language = 'en' WHERE language IS NULL;
