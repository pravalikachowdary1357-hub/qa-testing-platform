-- Demo login for the Top Management role (same default demo password as the
-- other demo accounts). Safe to run more than once.
INSERT INTO "users" ("id", "email", "password_hash", "name", "status", "role_id", "organization_id", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  'top.management@testsphere.local',
  '$2b$10$9ASZmn1u9hJVjnPoOdw6reTnASsVM96zJwQK9f4EyAZ.OLDY7vEi6',
  'Top Management',
  'ACTIVE'::"UserStatus",
  r."id",
  (SELECT u."organization_id" FROM "users" u WHERE u."email" = 'qa.manager@testsphere.local'),
  now(),
  now()
FROM "roles" r
WHERE r."name" = 'Top Management'
ON CONFLICT ("email") DO NOTHING;
