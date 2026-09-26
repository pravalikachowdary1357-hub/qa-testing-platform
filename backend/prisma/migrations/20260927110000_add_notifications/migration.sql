-- In-app notifications.
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New Administrator permission: manage integrations (Teams/Slack webhooks,
-- email test). Granted ONLY to System Administrator; no other role changes.
INSERT INTO "permissions" ("id", "key", "resource", "action", "description")
SELECT gen_random_uuid()::text, 'integrations:manage', 'integrations', 'manage',
       'Configure Teams/Slack webhooks and send integration test messages'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "key" = 'integrations:manage');

INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid()::text, r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'integrations:manage'
WHERE r."name" = 'System Administrator'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
