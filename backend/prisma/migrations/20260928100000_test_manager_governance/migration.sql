-- Test Manager completion (Roles & Responsibilities section 3 + RACI).
-- 1) Test plan strategy/governance fields, approval and completion sign-off.
-- 2) Test case approval record.
-- 3) New approval permissions and the Test Manager permission alignment.
-- Additive columns only; no existing data is changed or deleted.

ALTER TABLE "test_plans"
  ADD COLUMN IF NOT EXISTS "is_master" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scope" TEXT,
  ADD COLUMN IF NOT EXISTS "objectives" TEXT,
  ADD COLUMN IF NOT EXISTS "test_levels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "test_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "approach" TEXT,
  ADD COLUMN IF NOT EXISTS "entry_criteria" TEXT,
  ADD COLUMN IF NOT EXISTS "exit_criteria" TEXT,
  ADD COLUMN IF NOT EXISTS "estimated_effort_hours" INTEGER,
  ADD COLUMN IF NOT EXISTS "resources" TEXT,
  ADD COLUMN IF NOT EXISTS "risks" TEXT,
  ADD COLUMN IF NOT EXISTS "milestones" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "review_comment" TEXT,
  ADD COLUMN IF NOT EXISTS "completed_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completion_summary" TEXT;

ALTER TABLE "test_plans"
  ADD CONSTRAINT "test_plans_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id")
  REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "test_plans"
  ADD CONSTRAINT "test_plans_completed_by_id_fkey" FOREIGN KEY ("completed_by_id")
  REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "test_cases"
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
ALTER TABLE "test_cases"
  ADD CONSTRAINT "test_cases_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id")
  REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New approval permissions.
INSERT INTO "permissions" ("id", "key", "resource", "action", "description")
SELECT gen_random_uuid()::text, v.key, v.resource, 'approve', v.description
FROM (VALUES
  ('test_plans:approve', 'test_plans', 'Approve/sign off on test plans (incl. completion criteria)'),
  ('test_cases:approve', 'test_cases', 'Approve/sign off on test cases')
) AS v(key, resource, description)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."key" = v.key);

-- Test Manager: grant approvals and the product/project context it plans
-- against. Only the built-in "Test Manager" role; custom roles untouched.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" IN (
  'test_plans:approve', 'test_cases:approve', 'products:read', 'projects:read'
)
WHERE r."name" = 'Test Manager'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );

-- Test Manager is Accountable (not Responsible) for execution and
-- requirement authoring in the RACI: remove the hands-on execute rights and
-- requirement authoring. Requirement read + approve (review) stay.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  AND r."name" = 'Test Manager'
  AND p."key" IN (
    'test_executions:execute', 'automation:execute', 'api_testing:execute',
    'performance_testing:execute', 'security_testing:execute', 'uat:execute',
    'requirements:write', 'requirements:manage'
  );

UPDATE "roles"
SET "description" = 'Overall testing ownership: test strategy, master test plan, scope, effort, resources, milestones and risks; approves test plans, completion criteria, test cases and requirements; monitors progress, coverage and defects; supports release decisions. Accountable for execution but does not execute tests.',
    "updated_at" = now()
WHERE "name" = 'Test Manager';
