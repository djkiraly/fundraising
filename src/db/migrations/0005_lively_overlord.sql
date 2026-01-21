-- Add slug column as nullable first
ALTER TABLE "players" ADD COLUMN "slug" varchar(255);

-- Update existing players with slugs based on their names
UPDATE "players"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM("name"), '[^\w\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE "slug" IS NULL;

-- Handle duplicate slugs by appending row number
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "created_at") as rn
  FROM "players"
)
UPDATE "players" p
SET "slug" = p.slug || '-' || d.rn
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Now make the column NOT NULL
ALTER TABLE "players" ALTER COLUMN "slug" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_slug_unique" UNIQUE("slug");
