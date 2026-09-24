// One-time, standalone, targeted script -- NOT part of seed.cjs, NOT wired
// into `build`/`migrate deploy`/CI. Its ONLY purpose is to reset the
// password for the 3 demo accounts created by
// create-missing-production-demo-roles.cjs, so they match the single
// hardcoded DEMO_PASSWORD ('ChangeMe123!') that the frontend's "Demo
// Credentials" page (LoginPage.tsx) sends for every one of the 9 demo
// accounts -- the same default every other pre-existing demo account
// already uses.
//
// This script touches ONLY the `passwordHash` column, on ONLY these 3
// exact, hardcoded email addresses, via `user.update()`. It never touches
// name, role, status, email, or organizationId, never creates or deletes
// anything, and never processes any other user.
//
// Safety gates (same two-flag pattern as the sibling scripts in this
// folder): both DRY_RUN=false AND CONFIRM_PRODUCTION_WRITE=true are
// required to perform the real write; either one missing/wrong keeps this
// in dry-run (inspect-only) mode. Preflight (all 3 target emails exist)
// runs in both modes and aborts before opening any transaction if it fails.
//
// Usage:
//   Dry run (default, makes no changes):
//     DATABASE_URL="..." node prisma/reset-demo-role-passwords.cjs
//
//   Real run (only after reviewing the dry-run output):
//     DATABASE_URL="..." DRY_RUN=false CONFIRM_PRODUCTION_WRITE=true \
//       node prisma/reset-demo-role-passwords.cjs
//
// Optional: set DEMO_PASSWORD to override the target password (defaults to
// 'ChangeMe123!', matching frontend/src/pages/LoginPage.tsx's DEMO_PASSWORD
// constant and seed.cjs's SEED_DEFAULT_PASSWORD default).
const path = require('path');

const bcrypt = require(
  path.join(__dirname, '..', 'node_modules', 'bcryptjs'),
);
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

// Hardcoded, exact -- never derived from a pattern or query, so this script
// is structurally incapable of touching any account other than these 3.
const TARGET_EMAILS = [
  'automation.engineer@testsphere.local',
  'database.engineer@testsphere.local',
  'uat.coordinator@testsphere.local',
];

const NEW_PASSWORD = process.env.DEMO_PASSWORD || 'ChangeMe123!';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const CONFIRMED = process.env.CONFIRM_PRODUCTION_WRITE === 'true';
const WILL_EXECUTE = !DRY_RUN && CONFIRMED;

async function runPreflight() {
  const problems = [];

  const existing = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: { id: true, email: true, role: { select: { name: true } } },
  });
  const foundByEmail = new Map(existing.map((u) => [u.email, u]));

  for (const email of TARGET_EMAILS) {
    if (!foundByEmail.has(email)) {
      problems.push(`Target user "${email}" does not exist -- nothing to reset.`);
    }
  }

  return { problems, foundByEmail };
}

async function main() {
  console.log(`Mode: ${WILL_EXECUTE ? 'LIVE EXECUTION' : 'DRY RUN (no changes will be made)'}`);
  console.log(`  DRY_RUN=${process.env.DRY_RUN ?? '(unset, defaults to dry-run)'}`);
  console.log(`  CONFIRM_PRODUCTION_WRITE=${process.env.CONFIRM_PRODUCTION_WRITE ?? '(unset)'}`);
  console.log(`  Target password source: ${process.env.DEMO_PASSWORD ? 'DEMO_PASSWORD env var' : "default 'ChangeMe123!'"}`);
  console.log('');

  console.log('Running preflight checks...');
  const { problems, foundByEmail } = await runPreflight();

  if (problems.length > 0) {
    console.error(`\nPreflight FAILED with ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('\nAborting -- no changes made.');
    process.exitCode = 1;
    return;
  }

  console.log('Preflight passed: all 3 target accounts exist.\n');
  for (const email of TARGET_EMAILS) {
    const u = foundByEmail.get(email);
    console.log(`Will reset password for "${email}" (id=${u.id}, role=${u.role.name}). Only passwordHash will change.`);
  }

  if (!WILL_EXECUTE) {
    console.log('\nDRY RUN complete. No changes were made. Re-run with DRY_RUN=false and CONFIRM_PRODUCTION_WRITE=true to apply.');
    return;
  }

  console.log('\nLIVE MODE confirmed -- proceeding inside a single transaction...');

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

  const updated = await prisma.$transaction(
    TARGET_EMAILS.map((email) =>
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
    ),
  );

  console.log('\n=== VERIFICATION REPORT ===');
  for (const user of updated) {
    console.log(`  - ${user.email} (id=${user.id}) -- passwordHash updated at ${user.updatedAt.toISOString()}`);
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
