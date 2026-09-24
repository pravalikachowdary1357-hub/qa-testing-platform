// Read-only diagnostic. Makes zero writes -- only a findUnique (read) and a
// local bcrypt.compare (pure computation, no DB interaction). Checks
// whether the currently stored passwordHash for the given account actually
// matches the expected password, to isolate whether a login failure is a
// storage problem or something else (e.g. the deployed app's own
// environment/dependencies).
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));
const { PrismaClient } = require(
  path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js'),
);
const { PrismaPg } = require(path.join(__dirname, '..', 'node_modules', '@prisma', 'adapter-pg'));

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EMAILS = [
  'automation.engineer@testsphere.local',
  'database.engineer@testsphere.local',
  'uat.coordinator@testsphere.local',
  // Control group: a known-working account, for comparison.
  'developer@testsphere.local',
];
const TEST_PASSWORD = 'ChangeMe123!';

(async () => {
  for (const email of EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true, passwordHash: true, updatedAt: true },
    });
    if (!user) {
      console.log(`${email} -> NOT FOUND`);
      continue;
    }
    const matches = await bcrypt.compare(TEST_PASSWORD, user.passwordHash);
    console.log(
      `${email} | status=${user.status} | updatedAt=${user.updatedAt.toISOString()} | hashPrefix=${user.passwordHash.slice(0, 7)} | hashLength=${user.passwordHash.length} | compare('${TEST_PASSWORD}')=${matches}`,
    );
  }
  await prisma.$disconnect();
})();
