-- Data-only migration: rename every role to its short name IN PLACE (same
-- id), so users keep their role and all permission grants stay intact.
-- Also renames demo users whose display name was the old role name.
-- Safe to run on any database state: a rename is skipped when the short
-- name already exists or when no old name is present.
DO $$
DECLARE
  m RECORD;
  old_role RECORD;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('System Administrator', ARRAY['QMICS TestSphere Administrator', 'Admin']),
      ('Test Manager',         ARRAY['Test Manager / Test Program Manager', 'QA Manager']),
      ('Test Lead',            ARRAY['Test Lead / QA Lead', 'Test Lead / Test Manager']),
      ('Tester',               ARRAY['Tester / Test Engineer / QA Engineer']),
      ('UAT Coordinator',      ARRAY['UAT Coordinator / Business Tester']),
      ('Product Owner',        ARRAY['Product Owner / Release Approver', 'Business/Release Approver'])
    ) AS t(new_name, old_names)
  LOOP
    IF EXISTS (SELECT 1 FROM "roles" WHERE "name" = m.new_name) THEN
      CONTINUE;
    END IF;

    SELECT "id", "name" INTO old_role
    FROM "roles"
    WHERE "name" = ANY (m.old_names)
    ORDER BY array_position(m.old_names, "name")
    LIMIT 1;

    IF old_role.id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE "users" SET "name" = m.new_name, "updated_at" = now()
    WHERE "role_id" = old_role.id AND "name" = old_role.name;

    UPDATE "roles" SET "name" = m.new_name, "updated_at" = now()
    WHERE "id" = old_role.id;

    old_role := NULL;
  END LOOP;
END $$;
