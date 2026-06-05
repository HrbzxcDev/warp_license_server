CREATE TABLE IF NOT EXISTS "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_key" text NOT NULL,
	"product" text DEFAULT 'default' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"machine_id" text,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "licenses_license_key_unique" UNIQUE("license_key")
);
