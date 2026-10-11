-- Gives the Test Manager role the project/requirement permissions automatically
-- when the backend is deployed, so nobody has to run the seed or tick boxes by hand.
-- Only ADDS grants (never removes any); safe to run more than once.

INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p
  ON p."resource" IN ('projects', 'products', 'product_documents')
  OR p."key" IN ('requirements:read', 'requirements:write', 'requirements:approve', 'organizations:read')
WHERE r."name" = 'Test Manager'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
