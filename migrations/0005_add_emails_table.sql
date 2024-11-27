CREATE TABLE IF NOT EXISTS "emails" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "subject" text NOT NULL,
    "body" text NOT NULL,
    "from_email" text NOT NULL,
    "to_email" text NOT NULL,
    "status" text DEFAULT 'inbox' NOT NULL,
    "is_read" text DEFAULT 'false' NOT NULL,
    "attachments" text[],
    "client_id" uuid,
    "offer_id" uuid,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
