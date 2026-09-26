-- Separate migration: PostgreSQL cannot use an enum value in the same
-- transaction that added it. New defects now start in "New" (the first
-- status of the source lifecycle). Existing rows are not touched.
ALTER TABLE "defects" ALTER COLUMN "status" SET DEFAULT 'NEW';
