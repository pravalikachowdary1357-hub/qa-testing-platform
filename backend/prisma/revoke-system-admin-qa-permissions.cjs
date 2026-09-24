// One-time, standalone administrative script -- NOT part of seed.cjs, NOT
// wired into `build`/`migrate deploy`/CI. Its ONLY purpose is to remove the
// 39 QA-execution permission grants from the "System Administrator" role,
// matching the exclusion list already applied to seed.cjs's ROLE_GRANTS for
// local/dev. Safe to run against production because its blast radius is
// exactly one thing: RolePermission rows where roleId = System
// Administrator's id AND permissionId belongs to one of the 11 excluded
// modules below. It never touches the Permission catalog, other Role rows,
// User/Organization/Product/any business data, and never runs migrations.
//
// Usage:
//   Dry run (default, makes no changes):
//     DATABASE_URL="..." node prisma/revoke-system-admin-qa-permissions.cjs
//
//   Real run (only after reviewing the dry-run output):
//     DATABASE_URL="..." DRY_RUN=false CONFIRM_PRODUCTION_PERMISSION_CHANGE=true \
//       node prisma/revoke-system-admin-qa-permissions.cjs
//
// Both DRY_RUN=false AND CONFIRM_PRODUCTION_PERMISSION_CHANGE=true are
// required to perform the real deletion -- either one missing/wrong keeps
// this in dry-run (inspect-only) mode.
const path = require('path');

// Same require pattern as seed.cjs: needs the compiled Prisma client, so
// `npm run build` / `npx nest build` must have been run first.
const { PrismaClient } = require(
  path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js'),
);
const { PrismaPg } = require(
  path.join(__dirname, '..', 'node_modules', '@prisma', 'adapter-pg'),
);

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLE_NAME = 'System Administrator';

// The exact 11 modules approved for removal from System Administrator.
// Actions listed here must match MODULES in seed.cjs -- used only to build
// the list of permission KEYS to look up (never hard-coded UUIDs); the
// actual ids are always fetched from the database.
const EXPECTED_MODULE_ACTIONS = {
  test_scenarios: ['read', 'write', 'manage'],
  test_cases: ['read', 'write', 'manage'],
  test_data: ['read', 'write', 'manage'],
  environments: ['read', 'write', 'manage'],
  test_executions: ['read', 'execute', 'manage'],
  defects: ['read', 'write', 'manage'],
  automation: ['read', 'write', 'execute', 'manage'],
  api_testing: ['read', 'write', 'execute', 'manage'],
  performance_testing: ['read', 'write', 'execute', 'manage'],
  security_testing: ['read', 'write', 'execute', 'manage'],
  uat: ['read', 'write', 'execute', 'approve', 'manage'],
};

const EXPECTED_KEYS = Object.entries(EXPECTED_MODULE_ACTIONS).flatMap(([module, actions]) =>
  actions.map((action) => `${module}:${action}`),
);

// The other 5 current roles -- used only for a before/after sanity check
// that this script did not touch them. Looked up by name, not hard-coded ids.
const OTHER_ROLE_NAMES = [
  'QA Manager',
  'Test Lead / Test Manager',
  'Tester',
  'Developer',
  'Business/Release Approver',
];

// Default is DRY RUN. Both flags below must be set correctly to perform the
// real deletion; either one missing/wrong keeps this inspect-only.
const DRY_RUN = process.env.DRY_RUN !== 'false';
const CONFIRMED = process.env.CONFIRM_PRODUCTION_PERMISSION_CHANGE === 'true';
const WILL_EXECUTE = !DRY_RUN && CONFIRMED;

async function snapshotOtherRoleGrantCounts() {
  const roles = await prisma.role.findMany({
    where: { name: { in: OTHER_ROLE_NAMES } },
    include: { _count: { select: { rolePermissions: true } } },
  });
  return new Map(roles.map((r) => [r.name, r._count.rolePermissions]));
}

async function main() {
  console.log(`Mode: ${WILL_EXECUTE ? 'LIVE EXECUTION' : 'DRY RUN (no changes will be made)'}`);
  console.log(`  DRY_RUN=${process.env.DRY_RUN ?? '(unset, defaults to dry-run)'}`);
  console.log(`  CONFIRM_PRODUCTION_PERMISSION_CHANGE=${process.env.CONFIRM_PRODUCTION_PERMISSION_CHANGE ?? '(unset)'}`);
  console.log('');

  // Safety requirement 1/2: locate role by exact name; abort if missing.
  const role = await prisma.role.findUnique({ where: { name: ROLE_NAME } });
  if (!role) {
    console.error(`ERROR: role "${ROLE_NAME}" not found. Aborting -- no changes made.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Role "${ROLE_NAME}" found. id=${role.id}`);

  // Safety requirement 3/4/5: look up permission ids by key, verify every
  // expected key exists, abort with no changes if any are missing.
  const permissions = await prisma.permission.findMany({
    where: { key: { in: EXPECTED_KEYS } },
    select: { id: true, key: true },
  });
  const foundKeys = new Set(permissions.map((p) => p.key));
  const missingKeys = EXPECTED_KEYS.filter((key) => !foundKeys.has(key));

  if (missingKeys.length > 0) {
    console.error(
      `ERROR: ${missingKeys.length} expected permission key(s) are missing from the Permission table:`,
    );
    missingKeys.forEach((key) => console.error(`  - ${key}`));
    console.error('Aborting -- no changes made.');
    process.exitCode = 1;
    return;
  }
  console.log(`All ${EXPECTED_KEYS.length} expected permission keys found in the catalog.`);

  const permissionIds = permissions.map((p) => p.id);

  // Safety requirement 6/11: print role id, current grant count, and the
  // exact keys that will be removed -- before touching anything.
  const currentGrants = await prisma.rolePermission.findMany({
    where: { roleId: role.id, permissionId: { in: permissionIds } },
    include: { permission: { select: { key: true } } },
  });
  const currentKeys = currentGrants.map((g) => g.permission.key).sort();

  console.log(`\nCurrent matching grants on "${ROLE_NAME}": ${currentGrants.length}`);
  console.log('Permission keys that will be removed:');
  currentKeys.forEach((key) => console.log(`  - ${key}`));

  if (currentGrants.length === 0) {
    console.log(`\nNothing to remove -- "${ROLE_NAME}" already has none of these grants. No changes needed.`);
    return;
  }

  if (!WILL_EXECUTE) {
    console.log(`\nDRY RUN complete. ${currentGrants.length} grant(s) WOULD be removed.`);
    console.log(
      'To actually apply this, re-run with DRY_RUN=false and CONFIRM_PRODUCTION_PERMISSION_CHANGE=true.',
    );
    return;
  }

  // Baseline snapshot of the other 5 roles, taken before the delete, so we
  // can prove afterward that this script did not touch them.
  const beforeOtherRoles = await snapshotOtherRoleGrantCounts();

  console.log('\nLIVE MODE confirmed -- proceeding with deletion...');

  // Safety requirement 9/13: the only write this script performs, scoped to
  // exactly this role id and exactly these permission ids, with the
  // verification read in the same transaction (project convention: array
  // form of $transaction, matching roles.service.ts's own permission-sync
  // logic).
  const [deleteResult, remainingAfterDelete] = await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: permissionIds } },
    }),
    prisma.rolePermission.findMany({
      where: { roleId: role.id, permissionId: { in: permissionIds } },
    }),
  ]);

  // Safety requirement 12: re-query and print removed count, remaining
  // matching grants, and confirm the other 5 roles are unchanged.
  const afterOtherRoles = await snapshotOtherRoleGrantCounts();
  const unaffected = OTHER_ROLE_NAMES.every(
    (name) => beforeOtherRoles.get(name) === afterOtherRoles.get(name),
  );

  console.log(`\nRemoved ${deleteResult.count} grant(s).`);
  console.log(`Remaining matching grants on "${ROLE_NAME}": ${remainingAfterDelete.length} (expected 0).`);
  console.log(`Other 5 roles unaffected: ${unaffected}`);
  OTHER_ROLE_NAMES.forEach((name) => {
    console.log(`  - ${name}: ${beforeOtherRoles.get(name)} -> ${afterOtherRoles.get(name)}`);
  });

  if (!unaffected) {
    console.error(
      'WARNING: an other-role permission count changed during this run. This script only deletes rows scoped to the target roleId, so this likely indicates a concurrent change made by something else at the same time -- investigate before trusting this result.',
    );
  }
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
