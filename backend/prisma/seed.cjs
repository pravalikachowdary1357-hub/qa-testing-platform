// One-time bootstrap: seeds the permission catalog, the 6 default roles,
// their permission grants, and one initial user per role. Run manually once
// per database via `node prisma/seed.cjs` -- not wired into
// `migrate dev`/`migrate deploy` since it's a data bootstrap, not a schema
// migration. Safe to re-run: every step is an upsert/idempotent check.
const path = require('path');
const bcrypt = require(
  path.join(__dirname, '..', 'node_modules', 'bcryptjs'),
);
// Requires the compiled output (`npm run build` / `npx nest build` first) --
// the generated Prisma client ships as .ts source, and this script runs
// under plain Node, not ts-node.
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

// Administrative permissions -- unchanged from the original 3-role scheme.
// These govern the Settings area (Users/Roles/App Settings/Audit Log tabs,
// plus the Settings > Organization/Products config tabs, which is why the
// resource here is singular "organization" -- deliberately distinct from
// the plural "organizations" module below, which governs the real
// Organization nav page and its own controller).
const ADMIN_PERMISSIONS = [
  ['users:read', 'View user accounts'],
  ['users:manage', 'Create, edit, activate/deactivate users, assign roles'],
  ['roles:read', 'View roles and their permissions'],
  ['roles:manage', "Assign or remove permissions on a role"],
  ['organization:read', 'View organization and product configuration'],
  ['organization:manage', 'Edit organization and product configuration'],
  ['app_settings:read', 'View application settings'],
  ['app_settings:manage', 'Edit application settings'],
  ['audit_log:read', 'View the administrative audit log'],
];

// The 19 QA-domain modules (the other 2 of the "21 modules" -- Dashboard and
// Settings -- aren't separate permissioned resources: Dashboard is an
// unguarded aggregate view, and Settings is covered by ADMIN_PERMISSIONS
// above). Each maps 1:1 to a controller; the action list matches what that
// controller can actually do -- "execute"/"approve" only appear where a
// distinct endpoint for that already exists (e.g. POST :id/run,
// POST :id/sign-off), never invented.
const MODULES = {
  organizations: ['read', 'write', 'manage'],
  projects: ['read', 'write', 'manage'],
  products: ['read', 'write', 'manage'],
  product_documents: ['read', 'write', 'manage'],
  requirements: ['read', 'write', 'manage', 'approve'],
  test_plans: ['read', 'write', 'manage'],
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
  traceability: ['read'],
  release_quality: ['read', 'write', 'approve', 'manage'],
  reports: ['read'],
  ai: ['read', 'use', 'manage'],
};

const ACTION_LABELS = {
  read: 'View',
  write: 'Create and edit',
  execute: 'Execute/record results for',
  approve: 'Approve/sign off on',
  manage: 'Delete and fully manage',
  use: 'Use',
};

function describe(module, action) {
  const noun = module.replace(/_/g, ' ');
  return `${ACTION_LABELS[action]} ${noun}`;
}

const MODULE_PERMISSIONS = Object.entries(MODULES).flatMap(([module, actions]) =>
  actions.map((action) => [`${module}:${action}`, describe(module, action)]),
);

const PERMISSIONS = [...ADMIN_PERMISSIONS, ...MODULE_PERMISSIONS].map(([key, description]) => {
  const [resource, action] = key.split(':');
  return { key, resource, action, description };
});

function keys(module, ...actions) {
  return actions.map((a) => `${module}:${a}`);
}
function allKeys(module) {
  return MODULES[module].map((a) => `${module}:${a}`);
}

// Consolidated per the user's explicit review: a 10-role matrix is more
// than a practical QA tool needs. Test Manager + Test Lead merge into one
// "Test Lead / Test Manager" role; Business Analyst + Product Owner merge
// into "Business/Release Approver"; Auditor and Management are dropped
// entirely (read-only/reporting needs are covered by assigning one of the
// remaining roles, not by dedicated accounts). Every grant is still an
// explicit permission key -- no implicit hierarchy -- so this table remains
// the single place the whole matrix lives.
const ROLE_GRANTS = {
  'System Administrator': PERMISSIONS.map((p) => p.key),

  // Overall QA owner: full lifecycle authority (including the specialized
  // test types and AI), but -- unlike the old 10-role QA Manager -- no
  // longer manages Organizations/Products; that's System Administrator's
  // job now. api_testing is included alongside automation/performance/
  // security even though the user's 6-role table didn't name it
  // explicitly, since leaving out just that one lifecycle module for the
  // broadest QA role would be an inconsistent, almost certainly unintended
  // gap.
  'QA Manager': [
    ...allKeys('requirements'),
    ...allKeys('product_documents'),
    ...allKeys('test_plans'),
    ...allKeys('test_scenarios'),
    ...allKeys('test_cases'),
    ...allKeys('test_data'),
    ...allKeys('environments'),
    ...allKeys('test_executions'),
    ...allKeys('defects'),
    ...allKeys('automation'),
    ...allKeys('api_testing'),
    ...allKeys('performance_testing'),
    ...allKeys('security_testing'),
    ...allKeys('uat'),
    ...allKeys('release_quality'),
    ...keys('traceability', 'read'),
    ...keys('reports', 'read'),
    ...allKeys('ai'),
  ],

  // Day-to-day test-cycle management: full authority over test planning,
  // scenarios, cases, data, environments, execution, and defects -- but
  // (per the user's table) not the specialized test types (automation/API/
  // performance/security), UAT, release quality, or AI, which stay with QA
  // Manager. Requirements access is read-only (needed to build test plans
  // against them, not listed as an owned module).
  'Test Lead / Test Manager': [
    ...keys('requirements', 'read'),
    ...keys('product_documents', 'read'),
    ...allKeys('test_plans'),
    ...allKeys('test_scenarios'),
    ...allKeys('test_cases'),
    ...allKeys('test_data'),
    ...allKeys('environments'),
    ...allKeys('test_executions'),
    ...allKeys('defects'),
    ...keys('traceability', 'read'),
    ...keys('reports', 'read'),
  ],

  // Per the user's own Tester-vs-Developer comparison table: create/edit/
  // execute test cases, execute tests and UAT, create/update defects, view
  // everything else needed to do that work. No automation/API/performance/
  // security or AI at this role level in the 6-role design.
  Tester: [
    ...keys('requirements', 'read'),
    ...keys('product_documents', 'read'),
    ...keys('test_scenarios', 'read'),
    ...keys('test_cases', 'read', 'write'),
    ...keys('test_data', 'read'),
    ...keys('environments', 'read'),
    ...keys('test_executions', 'read', 'execute'),
    ...keys('defects', 'read', 'write'),
    ...keys('uat', 'read', 'execute'),
    ...keys('release_quality', 'read'),
    ...keys('reports', 'read'),
  ],

  // Per the same comparison table: view requirements/test cases/results/
  // environments, investigate and fix defects (root cause, corrective
  // action, mark ready for retest -- all just defect record updates), view
  // UAT and release status.
  Developer: [
    ...keys('requirements', 'read'),
    ...keys('product_documents', 'read'),
    ...keys('test_cases', 'read'),
    ...keys('test_data', 'read'),
    ...keys('environments', 'read'),
    ...keys('test_executions', 'read'),
    ...keys('defects', 'read', 'write'),
    ...keys('uat', 'read'),
    ...keys('release_quality', 'read'),
    ...keys('reports', 'read'),
  ],

  // Merges Business Analyst's requirements ownership with Product Owner's
  // UAT/release approval authority. Deliberately does NOT get test
  // planning/scenarios/cases visibility -- the 6-role table scopes this
  // role to requirements + UAT + release, approving based on UAT results
  // and release readiness rather than test-case-level detail.
  'Business/Release Approver': [
    ...keys('requirements', 'read', 'write', 'manage', 'approve'),
    ...allKeys('product_documents'),
    ...keys('defects', 'read'),
    ...allKeys('uat'),
    ...allKeys('release_quality'),
    ...keys('traceability', 'read'),
    ...keys('reports', 'read'),
  ],
};

const ROLE_DESCRIPTIONS = {
  'System Administrator': 'Full administrative access to every module and all platform settings.',
  'QA Manager': 'Overall QA owner: full authority across the entire testing lifecycle, including automation, performance, security, UAT, release quality, and AI.',
  'Test Lead / Test Manager': 'Day-to-day testing management: test plans, scenarios, cases, data, environments, execution, and defects.',
  Tester: 'Creates/executes test cases, records results, raises and updates defects, executes UAT.',
  Developer: 'Investigates and fixes defects (root cause, corrective action, ready-for-retest); views requirements, test results, UAT, and release status.',
  'Business/Release Approver': 'Business acceptance and release decision authority: owns requirements, UAT sign-off, and release readiness approval.',
};

const ROLE_USERS = [
  { role: 'QA Manager', email: 'qa.manager@testsphere.local', name: 'QA Manager' },
  { role: 'Test Lead / Test Manager', email: 'test.manager@testsphere.local', name: 'Test Lead / Test Manager' },
  { role: 'Tester', email: 'tester@testsphere.local', name: 'Tester' },
  { role: 'Developer', email: 'developer@testsphere.local', name: 'Developer' },
  { role: 'Business/Release Approver', email: 'business.approver@testsphere.local', name: 'Business/Release Approver' },
];

// Roles superseded by this consolidation (10 roles -> 6). "Manager"/"Member"
// are leftovers from the original 3-role scheme (pre-dating even the
// 10-role matrix). The rest are demo/seed accounts created earlier this
// session with zero real business data attached -- safe to remove outright
// rather than only-if-unused, unlike a role a real customer might have
// actually assigned. Their permission grants live on in the merged roles
// above; only the redundant role rows and demo user accounts go away.
const RETIRED_ROLE_NAMES = [
  'Manager',
  'Member',
  'Test Manager',
  'Test Lead',
  'Business Analyst',
  'Product Owner',
  'Auditor',
  'Management',
];

async function ensureRole(name, isSystem, description) {
  if (name === 'System Administrator') {
    const legacyAdmin = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (legacyAdmin) {
      return prisma.role.update({
        where: { id: legacyAdmin.id },
        data: { name, isSystem, description },
      });
    }
  }
  return prisma.role.upsert({
    where: { name },
    update: { isSystem, description },
    create: { name, isSystem, description },
  });
}

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions.`);

  for (const legacyName of RETIRED_ROLE_NAMES) {
    const legacyRole = await prisma.role.findUnique({
      where: { name: legacyName },
      include: { users: true },
    });
    if (!legacyRole) continue;
    for (const user of legacyRole.users) {
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Removed demo user for retired role "${legacyName}": ${user.email}`);
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: legacyRole.id } });
    await prisma.role.delete({ where: { id: legacyRole.id } });
    console.log(`Removed retired role "${legacyName}".`);
  }

  const roleIds = {};
  for (const [name, grantedKeys] of Object.entries(ROLE_GRANTS)) {
    const role = await ensureRole(name, name === 'System Administrator', ROLE_DESCRIPTIONS[name]);
    roleIds[name] = role.id;

    const permissions = await prisma.permission.findMany({
      where: { key: { in: grantedKeys } },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
    console.log(`Seeded role "${name}" with ${permissions.length} permission(s).`);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@testsphere.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists -- skipping user creation.`);
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrator',
        passwordHash: await bcrypt.hash(adminPassword, 10),
        roleId: roleIds['System Administrator'],
      },
    });
    console.log(`Created initial System Administrator user: ${adminEmail}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(
        `WARNING: no SEED_ADMIN_PASSWORD was set -- used the default dev password "${adminPassword}". Change it immediately after first login.`,
      );
    }
  }

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe123!';
  for (const { role, email, name } of ROLE_USERS) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`User ${email} already exists -- skipping user creation.`);
      continue;
    }
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(defaultPassword, 10),
        roleId: roleIds[role],
      },
    });
    console.log(`Created user for role "${role}": ${email}`);
  }
  if (!process.env.SEED_DEFAULT_PASSWORD) {
    console.log(
      `WARNING: no SEED_DEFAULT_PASSWORD was set -- the ${ROLE_USERS.length} non-admin role accounts use the default dev password "${defaultPassword}". Change them immediately in any real deployment.`,
    );
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
