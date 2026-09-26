// One-time, standalone script -- NOT part of seed.cjs or the build.
// Renames every role to its short name IN PLACE (same role id), so users
// keep their role and every permission grant stays untouched. Also renames
// the seeded demo users whose display name was the old long role name.
//
// Final names: System Administrator, Test Manager, Test Lead, Tester,
// Automation Engineer, Database Test Engineer, Developer, UAT Coordinator,
// Product Owner.
//
// Usage (Windows cmd, from the backend folder):
//   Dry run -- lists roles and planned renames, changes nothing:
//     node prisma/rename-roles.cjs
//   Real run:
//     set CONFIRM_RENAME=true
//     node prisma/rename-roles.cjs
//
// Uses DATABASE_URL from backend/.env (local DB) unless DATABASE_URL is
// already set in the shell, e.g. for production:
//     set DATABASE_URL=postgresql://...
const path = require('path');

const { PrismaClient } = require(
  path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js'),
);
const { PrismaPg } = require(
  path.join(__dirname, '..', 'node_modules', '@prisma', 'adapter-pg'),
);

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// new name -> every older name it may still have in a database
const RENAMES = {
  'System Administrator': ['QMICS TestSphere Administrator', 'Admin'],
  'Test Manager': ['Test Manager / Test Program Manager', 'QA Manager'],
  'Test Lead': ['Test Lead / QA Lead', 'Test Lead / Test Manager'],
  Tester: ['Tester / Test Engineer / QA Engineer'],
  'UAT Coordinator': ['UAT Coordinator / Business Tester'],
  'Product Owner': ['Product Owner / Release Approver', 'Business/Release Approver'],
};

const CONFIRMED = process.env.CONFIRM_RENAME === 'true';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/\/.*$/, '');
  console.log(`Database host: ${host || '(DATABASE_URL not set)'}`);
  console.log(CONFIRMED ? 'Mode: APPLY' : 'Mode: DRY RUN (set CONFIRM_RENAME=true to apply)');

  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  console.log('\nRoles currently in this database:');
  for (const r of roles) console.log(`  - ${r.name} (${r._count.users} user(s))`);

  const byName = new Map(roles.map((r) => [r.name, r]));
  const plan = [];
  for (const [newName, oldNames] of Object.entries(RENAMES)) {
    const found = oldNames.map((n) => byName.get(n)).filter(Boolean);
    if (found.length === 0) continue;
    if (byName.has(newName)) {
      console.log(`\nSKIP "${newName}": it already exists alongside ${found.map((r) => `"${r.name}"`).join(', ')} -- resolve manually.`);
      continue;
    }
    if (found.length > 1) {
      console.log(`\nSKIP "${newName}": several old names exist (${found.map((r) => `"${r.name}"`).join(', ')}) -- resolve manually.`);
      continue;
    }
    plan.push({ role: found[0], newName });
  }

  if (plan.length === 0) {
    console.log('\nNothing to rename -- all roles already use the short names.');
    return;
  }

  console.log('\nPlanned renames:');
  for (const { role, newName } of plan) console.log(`  "${role.name}" -> "${newName}"`);
  if (!CONFIRMED) return;

  await prisma.$transaction(async (tx) => {
    for (const { role, newName } of plan) {
      await tx.role.update({ where: { id: role.id }, data: { name: newName } });
      // Demo accounts were created with the role name as their display name.
      await tx.user.updateMany({
        where: { roleId: role.id, name: role.name },
        data: { name: newName },
      });
    }
  });
  console.log(`\nDone: renamed ${plan.length} role(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
