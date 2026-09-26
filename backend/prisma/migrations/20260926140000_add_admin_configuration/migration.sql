-- CreateTable
CREATE TABLE "platform_configurations" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by_user_id" TEXT,

    CONSTRAINT "platform_configurations_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "test_case_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preconditions" TEXT,
    "expected_result" TEXT,
    "priority" "TestCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "test_case_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_case_templates_name_key" ON "test_case_templates"("name");

-- Data: new Administrator permission keys (idempotent). Granted ONLY to the
-- System Administrator role; no other role's grants are touched.
INSERT INTO "permissions" ("id", "key", "resource", "action", "description")
SELECT gen_random_uuid()::text, p.key, p.resource, p.action, p.description
FROM (VALUES
  ('workflows:read',        'workflows',      'read',   'View test, defect and approval workflow configuration'),
  ('workflows:manage',      'workflows',      'manage', 'Configure test, defect and approval workflows'),
  ('test_templates:read',   'test_templates', 'read',   'View test case templates'),
  ('test_templates:manage', 'test_templates', 'manage', 'Create, edit and deactivate test case templates'),
  ('dashboards:manage',     'dashboards',     'manage', 'Configure which dashboard sections are shown'),
  ('integrations:read',     'integrations',   'read',   'View the status of supported integrations')
) AS p(key, resource, action, description)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" x WHERE x."key" = p.key);

INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" IN (
  'workflows:read', 'workflows:manage',
  'test_templates:read', 'test_templates:manage',
  'dashboards:manage', 'integrations:read'
)
WHERE r."name" = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
