// One-time, standalone script -- NOT part of seed.cjs or the build.
// Renames the platform admin role "QMICS TestSphere Administrator" to
// "System Administrator" in place (same role id), so every user assigned
// to it keeps the role and every permission grant stays untouched.
//
// Usage (Windows cmd, from the backend folder):
//   Dry run -- lists roles, changes nothing:
//     node prisma/rename-admin-role.cjs
//   Real run:
//     set CONFIRM_RENAME=true
//     node prisma/rename-admin-role.cjs
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

const OLD_NAME = 'QMICS TestSphere Administrator';
const NEW_NAME = 'System Administrator';
const CONFIRMED = process.env.CONFIRM_RENAME === 'true';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/\/.*$/, '');
  console.log(`Database host: ${host || '(DATABASE_URL not set)'}`);

  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  console.log('\nRoles currently in this database:');
  for (const r of roles) console.log(`  - ${r.name} (${r._count.users} user(s))`);

  const oldRole = roles.find((r) => r.name === OLD_NAME);
  const newRole = roles.find((r) => r.name === NEW_NAME);

  if (!oldRole) {
    console.log(
      newRole
        ? `\nNothing to do: "${NEW_NAME}" already exists and "${OLD_NAME}" does not.`
        : `\nNothing to do: no role named "${OLD_NAME}" exists.`,
    );
    return;
  }
  if (newRole) {
    console.log(`\nABORT: both "${OLD_NAME}" and "${NEW_NAME}" exist. Resolve manually.`);
    process.exitCode = 1;
    return;
  }
  if (!CONFIRMED) {
    console.log(`\nDRY RUN: would rename "${OLD_NAME}" -> "${NEW_NAME}".`);
    console.log('Run again after "set CONFIRM_RENAME=true" to apply.');
    return;
  }

  await prisma.role.update({ where: { id: oldRole.id }, data: { name: NEW_NAME } });
  console.log(`\nRenamed "${OLD_NAME}" -> "${NEW_NAME}" (id ${oldRole.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
