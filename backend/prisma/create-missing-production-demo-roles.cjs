// One-time, standalone, targeted bootstrap -- NOT part of seed.cjs, NOT
// wired into `build`/`migrate deploy`/CI. Its ONLY purpose is to create the
// 3 roles/users introduced by the 9-role RBAC restructuring that are still
// missing from an existing (already-deployed, pre-restructuring) production
// database: Automation Engineer, Database Test Engineer, and UAT Coordinator
// / Business Tester -- plus the RolePermission links for the first and
// third (Database Test Engineer intentionally gets none).
//
// This script performs ONLY additive creates. By construction it never
// calls `.update`, `.upsert`, or any `delete`/`deleteMany` -- there is no
// code path in this file that can modify or remove an existing row:
//   - Does NOT touch any of the 6 existing roles (System Administrator,
//     QA Manager, Test Lead / Test Manager, Tester, Developer,
//     Business/Release Approver) or their permissions.
//   - Does NOT process RETIRED_ROLE_NAMES or ROLE_RENAME_CHAINS (those are
//     seed.cjs concepts; this script doesn't import or reimplement them).
//   - Does NOT create or modify any Permission row -- the required
//     permission keys are looked up by exact key and must already exist;
//     the script aborts if any is missing rather than creating one.
//   - Does NOT touch organizations, projects, products, requirements,
//     teams, business units, or any other business data.
//   - Does NOT modify seed.cjs, schema.prisma, or package.json.
//
// Safety gates (same two-flag pattern as
// revoke-system-admin-qa-permissions.cjs): both DRY_RUN=false AND
// CONFIRM_PRODUCTION_WRITE=true are required to perform the real writes;
// either one missing/wrong keeps this in dry-run (inspect-only) mode. A
// full preflight (roles absent, emails absent, all required permission
// keys present) runs in BOTH modes and the script aborts before opening
// any transaction if a single check fails -- so a dry run is a true
// rehearsal of the real run, not just a preview.
//
// Usage:
//   Dry run (default, makes no changes -- also validates env/preflight):
//     DATABASE_URL="..." \
//     AUTOMATION_ENGINEER_PASSWORD="..." \
//     DATABASE_ENGINEER_PASSWORD="..." \
//     UAT_COORDINATOR_PASSWORD="..." \
//       node prisma/create-missing-production-demo-roles.cjs
//
//   Real run (only after reviewing the dry-run output):
//     DATABASE_URL="..." DRY_RUN=false CONFIRM_PRODUCTION_WRITE=true \
//     AUTOMATION_ENGINEER_PASSWORD="..." \
//     DATABASE_ENGINEER_PASSWORD="..." \
//     UAT_COORDINATOR_PASSWORD="..." \
//       node prisma/create-missing-production-demo-roles.cjs
//
// Each password is required explicitly (no default fallback) -- this
// targets production, so it deliberately does not fall back to seed.cjs's
// shared dev default password.
const path = require('path');

const bcrypt = require(
  path.join(__dirname, '..', 'node_modules', 'bcryptjs'),
);
// Requires the compiled output (`npm run build` / `npx nest build` first) --
// the generated Prisma client ships as .ts source, and this script runs
// under plain Node, not ts-node. Same pattern as seed.cjs.
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

// Exact descriptions copied verbatim from seed.cjs's ROLE_DESCRIPTIONS.
const TARGET_ROLES = [
  {
    name: 'Automation Engineer',
    description:
      'Owns test automation: develops/maintains automation frameworks, scripts, and repositories; executes automated regression; analyzes failures. Read-only on manual test cases/scenarios/execution history.',
    permissionKeys: [
      'automation:read',
      'automation:write',
      'automation:execute',
      'automation:manage',
      'test_cases:read',
      'test_scenarios:read',
      'test_executions:read',
      'reports:read',
    ],
  },
  {
    name: 'Database Test Engineer',
    description:
      'Reserved for a future database-testing capability (schema validation, data integrity, ETL, stored procedures). No TestSphere module exists for this yet, so this role currently has no granted permissions.',
    permissionKeys: [],
  },
  {
    name: 'UAT Coordinator',
    description:
      'Coordinates and executes User Acceptance Testing: prepares UAT test cases, manages UAT execution, records business-user feedback. Does not hold final UAT approval authority.',
    permissionKeys: [
      'uat:read',
      'uat:write',
      'uat:execute',
      'requirements:read',
      'test_cases:read',
      'reports:read',
    ],
  },
];

// email/name pairs copied verbatim from seed.cjs's ROLE_USERS.
const TARGET_USERS = [
  {
    role: 'Automation Engineer',
    email: 'automation.engineer@testsphere.local',
    name: 'Automation Engineer',
    passwordEnvVar: 'AUTOMATION_ENGINEER_PASSWORD',
  },
  {
    role: 'Database Test Engineer',
    email: 'database.engineer@testsphere.local',
    name: 'Database Test Engineer',
    passwordEnvVar: 'DATABASE_ENGINEER_PASSWORD',
  },
  {
    role: 'UAT Coordinator',
    email: 'uat.coordinator@testsphere.local',
    name: 'UAT Coordinator',
    passwordEnvVar: 'UAT_COORDINATOR_PASSWORD',
  },
];

const ALL_REQUIRED_PERMISSION_KEYS = [
  ...new Set(TARGET_ROLES.flatMap((r) => r.permissionKeys)),
];

const DRY_RUN = process.env.DRY_RUN !== 'false';
const CONFIRMED = process.env.CONFIRM_PRODUCTION_WRITE === 'true';
const WILL_EXECUTE = !DRY_RUN && CONFIRMED;

async function runPreflight() {
  const problems = [];

  // 1. Target roles must not already exist.
  const existingRoles = await prisma.role.findMany({
    where: { name: { in: TARGET_ROLES.map((r) => r.name) } },
    select: { id: true, name: true },
  });
  for (const role of existingRoles) {
    problems.push(`Role "${role.name}" already exists (id=${role.id}) -- refusing to touch it.`);
  }

  // 2. Target emails must not already exist.
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: TARGET_USERS.map((u) => u.email) } },
    select: { id: true, email: true },
  });
  for (const user of existingUsers) {
    problems.push(`User "${user.email}" already exists (id=${user.id}) -- refusing to touch it.`);
  }

  // 3. Every required permission key must already exist -- looked up by key,
  // never created here.
  const foundPermissions = await prisma.permission.findMany({
    where: { key: { in: ALL_REQUIRED_PERMISSION_KEYS } },
    select: { id: true, key: true },
  });
  const foundKeys = new Set(foundPermissions.map((p) => p.key));
  for (const key of ALL_REQUIRED_PERMISSION_KEYS) {
    if (!foundKeys.has(key)) {
      problems.push(`Required permission key "${key}" does not exist in the Permission catalog.`);
    }
  }
  const permissionIdByKey = new Map(foundPermissions.map((p) => [p.key, p.id]));

  // 4. Every target user's password env var must be set -- no default
  // fallback for a production-targeting script.
  for (const user of TARGET_USERS) {
    if (!process.env[user.passwordEnvVar]) {
      problems.push(`Environment variable ${user.passwordEnvVar} is not set (required for ${user.email}).`);
    }
  }

  return { problems, permissionIdByKey };
}

async function main() {
  console.log(`Mode: ${WILL_EXECUTE ? 'LIVE EXECUTION' : 'DRY RUN (no changes will be made)'}`);
  console.log(`  DRY_RUN=${process.env.DRY_RUN ?? '(unset, defaults to dry-run)'}`);
  console.log(`  CONFIRM_PRODUCTION_WRITE=${process.env.CONFIRM_PRODUCTION_WRITE ?? '(unset)'}`);
  console.log('');

  console.log('Running preflight checks...');
  const { problems, permissionIdByKey } = await runPreflight();

  if (problems.length > 0) {
    console.error(`\nPreflight FAILED with ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('\nAborting -- no changes made.');
    process.exitCode = 1;
    return;
  }
  console.log('Preflight passed: all 3 target roles absent, all 3 target emails absent, all required permission keys present, all passwords supplied.\n');

  for (const role of TARGET_ROLES) {
    console.log(
      `Will create role "${role.name}" with ${role.permissionKeys.length} permission(s): ${
        role.permissionKeys.join(', ') || '(none)'
      }`,
    );
  }
  for (const user of TARGET_USERS) {
    console.log(`Will create user "${user.email}" (role: ${user.role}).`);
  }

  if (!WILL_EXECUTE) {
    console.log('\nDRY RUN complete. No changes were made. Re-run with DRY_RUN=false and CONFIRM_PRODUCTION_WRITE=true to apply.');
    return;
  }

  console.log('\nLIVE MODE confirmed -- proceeding with creation inside a single transaction...');

  const result = await prisma.$transaction(async (tx) => {
    const createdRoles = {};
    for (const role of TARGET_ROLES) {
      const created = await tx.role.create({
        data: {
          name: role.name,
          description: role.description,
          isSystem: false,
        },
      });
      createdRoles[role.name] = created;

      if (role.permissionKeys.length > 0) {
        await tx.rolePermission.createMany({
          data: role.permissionKeys.map((key) => ({
            roleId: created.id,
            permissionId: permissionIdByKey.get(key),
          })),
        });
      }
    }

    const createdUsers = [];
    for (const user of TARGET_USERS) {
      const passwordHash = await bcrypt.hash(process.env[user.passwordEnvVar], 10);
      const created = await tx.user.create({
        data: {
          email: user.email,
          name: user.name,
          passwordHash,
          roleId: createdRoles[user.role].id,
        },
      });
      createdUsers.push(created);
    }

    return { createdRoles, createdUsers };
  });

  console.log('\n=== VERIFICATION REPORT ===');
  console.log('Created roles:');
  for (const role of TARGET_ROLES) {
    const created = result.createdRoles[role.name];
    console.log(`  - ${created.name} (id=${created.id}) -- ${role.permissionKeys.length} permission(s) granted`);
  }
  console.log('Created users:');
  for (const user of result.createdUsers) {
    console.log(`  - ${user.email} (id=${user.id})`);
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
