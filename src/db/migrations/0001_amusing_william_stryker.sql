ALTER TABLE "donations" ADD COLUMN "payment_provider" varchar(50) DEFAULT 'stripe';--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "square_payment_id" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "square_order_id" text;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_square_payment_id_unique" UNIQUE("square_payment_id");