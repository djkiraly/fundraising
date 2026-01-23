CREATE TYPE "public"."analytics_event_type" AS ENUM('page_view', 'square_click', 'square_hover', 'donation_started', 'donation_completed', 'donation_failed', 'donation_cancelled', 'share_click', 'outbound_link');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"event_type" "analytics_event_type" NOT NULL,
	"path" varchar(500) NOT NULL,
	"player_id" uuid,
	"square_id" uuid,
	"donation_id" uuid,
	"metadata" text,
	"value" numeric(10, 2),
	"ip_address" varchar(45),
	"user_agent" text,
	"country" varchar(100),
	"device_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"path" varchar(500) NOT NULL,
	"referrer" text,
	"player_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"country" varchar(100),
	"region" varchar(100),
	"city" varchar(100),
	"device_type" varchar(50),
	"browser" varchar(100),
	"os" varchar(100),
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_square_id_squares_id_fk" FOREIGN KEY ("square_id") REFERENCES "public"."squares"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page_views" ADD CONSTRAINT "page_views_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
