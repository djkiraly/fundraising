CREATE TABLE IF NOT EXISTS "donations_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donation_id" uuid,
	"player_id" uuid,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"amount" numeric(10, 2),
	"payment_method" varchar(50),
	"donor_name" varchar(255),
	"notes" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "manual_payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donations_audit_log" ADD CONSTRAINT "donations_audit_log_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donations_audit_log" ADD CONSTRAINT "donations_audit_log_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donations_audit_log" ADD CONSTRAINT "donations_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donations" ADD CONSTRAINT "donations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
