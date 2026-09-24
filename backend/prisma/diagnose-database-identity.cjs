// Read-only diagnostic. Zero writes. Lists all organizations and the total
// user count visible through this DATABASE_URL, so it can be compared
// against what the live deployed API returns for the same queries -- to
// determine whether they're actually the same physical database.
const path = require('path');
const { PrismaClient } = require(
  path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js'),
);
const { PrismaPg } = require(path.join(__dirname, '..', 'node_modules', '@prisma', 'adapter-pg'));

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

(async () => {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log('Total organizations visible via this DATABASE_URL:', orgs.length);
  for (const o of orgs) console.log(' -', o.id, '|', o.name);

  const userCount = await prisma.user.count();
  console.log('\nTotal users visible via this DATABASE_URL:', userCount);

  await prisma.$disconnect();
})();
