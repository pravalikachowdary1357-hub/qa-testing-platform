-- Human-readable IDs for Projects (PRJ-001...) and Requirements (REQ-001...).
-- Existing rows are numbered oldest-first; new rows get the next number from
-- the sequence via the column DEFAULT, so no application code has to assign it.

CREATE SEQUENCE IF NOT EXISTS "project_code_seq";
CREATE SEQUENCE IF NOT EXISTS "requirement_code_seq";

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "code" TEXT;

WITH n AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM "projects"
)
UPDATE "projects" p SET "code" = 'PRJ-' || lpad(n.rn::text, 3, '0')
FROM n WHERE n.id = p.id AND p."code" IS NULL;

WITH n AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM "requirements"
)
UPDATE "requirements" r SET "code" = 'REQ-' || lpad(n.rn::text, 3, '0')
FROM n WHERE n.id = r.id AND r."code" IS NULL;

SELECT setval('project_code_seq', GREATEST((SELECT count(*) FROM "projects"), 1), (SELECT count(*) > 0 FROM "projects"));
SELECT setval('requirement_code_seq', GREATEST((SELECT count(*) FROM "requirements"), 1), (SELECT count(*) > 0 FROM "requirements"));

ALTER TABLE "projects" ALTER COLUMN "code" SET DEFAULT ('PRJ-'::text || lpad((nextval('project_code_seq'::regclass))::text, 3, '0'::text));
ALTER TABLE "requirements" ALTER COLUMN "code" SET DEFAULT ('REQ-'::text || lpad((nextval('requirement_code_seq'::regclass))::text, 3, '0'::text));

ALTER TABLE "projects" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "requirements" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "projects_code_key" ON "projects"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "requirements_code_key" ON "requirements"("code");
