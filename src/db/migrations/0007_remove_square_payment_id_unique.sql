-- Remove unique constraint from square_payment_id to allow multi-square transactions
-- One Square payment can now be associated with multiple donation records

ALTER TABLE "donations" DROP CONSTRAINT IF EXISTS "donations_square_payment_id_unique";
