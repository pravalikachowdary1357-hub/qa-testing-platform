-- New view-only role "Top Management": sees the Dashboard only.
-- The dashboard's quality overview needs just the reports:read permission.
-- Safe to run more than once.

INSERT INTO "roles" ("id", "name", "description", "is_system", "created_at", "updated_at")
VALUES (
  gen_random_uuid()::text,
  'Top Management',
  'Executive view-only role: sees the Dashboard only, with no access to any other module.',
  true,
  now(),
  now()
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'reports:read'
WHERE r."name" = 'Top Management'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
