CREATE TABLE IF NOT EXISTS "email_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "subject" text NOT NULL,
    "body" text NOT NULL,
    "description" text,
    "variables" text[],
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Add unique constraint on template name
CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_templates_name" ON "email_templates" ("name");
