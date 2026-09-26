-- Data-only: let the roles that author test cases (they hold
-- test_cases:write) READ test case templates so they can start a new test
-- case from an enabled template. Management (test_templates:manage) stays
-- with the System Administrator only. Idempotent.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'test_templates:read'
WHERE r."name" IN ('Test Manager', 'Test Lead', 'Tester')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
