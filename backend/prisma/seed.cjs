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
  // Platform configuration (Roles & Responsibilities: configure workflows,
  // test templates, defect/approval workflows, dashboards, integrations).
  // Kept in sync with migration 20260926140000_add_admin_configuration.
  ['workflows:read', 'View test, defect and approval workflow configuration'],
  ['workflows:manage', 'Configure test, defect and approval workflows'],
  ['test_templates:read', 'View test case templates'],
  ['test_templates:manage', 'Create, edit and deactivate test case templates'],
  ['dashboards:manage', 'Configure which dashboard sections are shown'],
  ['integrations:read', 'View the status of supported integrations'],
  ['integrations:manage', 'Configure Teams/Slack webhooks and send integration test messages'],
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
  business_units: ['read', 'write', 'manage'],
  teams: ['read', 'write', 'manage'],
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

// 9-role model, evolved from the earlier 6-role consolidation (itself a
// consolidation of an original 10-role table). Every grant is still an
// explicit permission key -- no implicit hierarchy -- so this table remains
// the single place the whole matrix lives. Source: "QMICS TestSphere --
// Software Test Management System -- Roles & Responsibilities" document,
// mapped onto this application's actual modules per the approved role
// analysis (not a mechanical RACI-to-CRUD conversion).
//
const ROLE_GRANTS = {
  // Platform administration only -- an explicit inclusion list, not a filter
  // over the full permission catalog. The role administers the platform
  // (organizations, users, teams, roles, settings, audit) rather than doing
  // hands-on QA execution or holding testing-governance/oversight modules
  // (requirements, test planning, traceability, release quality, reports,
  // AI), which live solely with Test Manager. Listing every key explicitly
  // means a newly added module is never Administrator-visible by default --
  // it takes a deliberate addition here.
  'System Administrator': [
    'users:read',
    'users:manage',
    'roles:read',
    'roles:manage',
    'organization:read',
    'organization:manage',
    'app_settings:read',
    'app_settings:manage',
    'audit_log:read',
    'workflows:read',
    'workflows:manage',
    'test_templates:read',
    'test_templates:manage',
    'dashboards:manage',
    'integrations:read',
    'integrations:manage',
    ...allKeys('organizations'),
    ...allKeys('business_units'),
    ...allKeys('teams'),
    ...allKeys('projects'),
    ...allKeys('products'),
    ...allKeys('product_documents'),
  ],

  // Overall testing owner: strategy, governance, planning, quality, risk,
  // release readiness, and full lifecycle authority (including the
  // specialized test types and AI). api_testing is included alongside
  // automation/performance/security for the same reason it always has
  // been: leaving out just one lifecycle module for the broadest testing
  // role would be an inconsistent, almost certainly unintended gap.
  'Test Manager': [
    ...allKeys('requirements'),
    ...allKeys('product_documents'),
    ...allKeys('test_plans'),
    ...allKeys('test_scenarios'),
    ...allKeys('test_cases'),
    'test_templates:read', // use enabled templates when creating test cases
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
  // scenarios, cases, data, environments, execution, and defects -- but not
  // the specialized test types (automation/API/performance/security), UAT,
  // release quality, or AI, which stay with Test Manager. Requirements
  // access is read-only (needed to build test plans against them, not
  // listed as an owned module).
  'Test Lead': [
    ...keys('requirements', 'read'),
    ...keys('product_documents', 'read'),
    ...allKeys('test_plans'),
    ...allKeys('test_scenarios'),
    ...allKeys('test_cases'),
    'test_templates:read', // use enabled templates when creating test cases
    ...allKeys('test_data'),
    ...allKeys('environments'),
    ...allKeys('test_executions'),
    ...allKeys('defects'),
    ...keys('traceability', 'read'),
    ...keys('reports', 'read'),
  ],

  // Hands-on execution: create/edit/execute test cases, execute tests and
  // UAT, create/update defects, view everything else needed to do that
  // work. Per the Roles & Responsibilities document review, this role also
  // represents the Performance/Security/API-Integration Test Engineer
  // responsibility areas -- read/write/execute only, no `manage` (framework/
  // deletion authority stays with Test Manager or, for automation
  // specifically, the dedicated Automation Engineer role below).
  'Tester': [
    ...keys('requirements', 'read'),
    ...keys('product_documents', 'read'),
    ...keys('test_scenarios', 'read'),
    ...keys('test_cases', 'read', 'write'),
    'test_templates:read', // use enabled templates when creating test cases
    ...keys('test_data', 'read'),
    ...keys('environments', 'read'),
    ...keys('test_executions', 'read', 'execute'),
    ...keys('defects', 'read', 'write'),
    ...keys('automation', 'read', 'write', 'execute'),
    ...keys('api_testing', 'read', 'write', 'execute'),
    ...keys('performance_testing', 'read', 'write', 'execute'),
    ...keys('security_testing', 'read', 'write', 'execute'),
    ...keys('uat', 'read', 'execute'),
    ...keys('release_quality', 'read'),
    ...keys('reports', 'read'),
  ],

  // NEW. Owns the automation framework/scripts/repositories -- the source
  // document's RACI gives "Automation" its own column, distinct from
  // Tester, in every activity row, and its section uses ownership language
  // ("maintain libraries", "maintain repositories") the API/performance/
  // security sections don't. Read-only on test_cases/test_scenarios/
  // test_executions (needs to know what to automate and see run history,
  // but doesn't author manual test cases -- matches the RACI's C-not-R
  // rating for Automation on Test Case Design). `automation:*` overlaps
  // intentionally with Tester/Test Manager above: the RACI marks Tester,
  // Automation, and Test Manager all Responsible/Accountable together on
  // Test Case Design, Test Execution, Defect Reporting, and Regression.
  'Automation Engineer': [
    ...allKeys('automation'),
    ...keys('test_cases', 'read'),
    ...keys('test_scenarios', 'read'),
    ...keys('test_executions', 'read'),
    ...keys('reports', 'read'),
  ],

  // NEW -- intentionally granted ZERO permissions. The document's Database
  // Test Engineer responsibilities (validate schemas, data integrity, ETL,
  // stored procedures, DB performance) have no corresponding module in this
  // application -- there is no database-testing entity/controller to grant
  // access to. The role exists (so it can be assigned and expanded later)
  // but is deliberately left non-functional rather than backfilled with
  // unrelated modules just to appear complete. Proposed future permission
  // keys (database_testing:read/write/execute/manage) are documented
  // separately, NOT added here, since nothing in the schema exists yet for
  // them to gate.
  'Database Test Engineer': [],

  // Unchanged: investigates and fixes defects (root cause, corrective
  // action, ready-for-retest -- all just defect record updates); views
  // requirements, test results, UAT, and release status.
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

  // NEW -- split out of the old "Business/Release Approver" for
  // segregation of duties: this role EXECUTES UAT (coordinates business
  // users, prepares UAT test cases, manages UAT execution, records
  // feedback), while "Product Owner" below APPROVES it.
  // The same account no longer does both. Deliberately no uat:approve or
  // uat:manage.
  'UAT Coordinator': [
    ...keys('uat', 'read', 'write', 'execute'),
    ...keys('requirements', 'read'),
    ...keys('test_cases', 'read'),
    ...keys('reports', 'read'),
  ],

  // Renamed from "Business/Release Approver" and narrowed: uat:write/
  // execute moved to the new UAT Coordinator role above, so this role can
  // no longer execute the UAT it's meant to approve. Still deliberately
  // does NOT get test planning/scenarios/cases visibility -- scopes to
  // requirements + UAT + release, approving based on results rather than
  // test-case-level detail.
  'Product Owner': [
    ...keys('requirements', 'read', 'write', 'manage', 'approve'),
    ...allKeys('product_documents'),
    ...keys('defects', 'read'),
    ...keys('uat', 'read', 'approve', 'manage'),
    ...allKeys('release_quality'),
    ...keys('traceability', 'read'),
    ...keys('reports', 'read'),
  ],
};

const ROLE_DESCRIPTIONS = {
  'System Administrator': 'Platform administration: organizations, business units, teams, projects, products, users, roles/permissions, and system/audit settings. Does not include any QA testing execution, planning, or governance -- that is Test Manager\'s domain.',
  'Test Manager': 'Overall testing ownership: strategy, governance, planning, quality risk, and release readiness, with full authority across the entire testing lifecycle including automation, performance, security, UAT, release quality, and AI.',
  'Test Lead': 'Day-to-day testing management: test plans, scenarios, cases, data, environments, execution, and defects.',
  'Tester': 'Creates/executes test cases, records evidence, raises and updates defects, executes UAT, and performs assigned specialized testing (automation, API, performance, security).',
  'Automation Engineer': 'Owns test automation: develops/maintains automation frameworks, scripts, and repositories; executes automated regression; analyzes failures. Read-only on manual test cases/scenarios/execution history.',
  'Database Test Engineer': 'Reserved for a future database-testing capability (schema validation, data integrity, ETL, stored procedures). No TestSphere module exists for this yet, so this role currently has no granted permissions.',
  Developer: 'Investigates and fixes defects (root cause, corrective action, ready-for-retest); views requirements, test results, UAT, and release status.',
  'UAT Coordinator': 'Coordinates and executes User Acceptance Testing: prepares UAT test cases, manages UAT execution, records business-user feedback. Does not hold final UAT approval authority.',
  'Product Owner': 'Business acceptance and release decision authority: owns requirements, approves UAT results, and approves release readiness. Does not execute UAT directly.',
};

const ROLE_USERS = [
  { role: 'Test Manager', email: 'qa.manager@testsphere.local', name: 'Test Manager' },
  { role: 'Test Lead', email: 'test.manager@testsphere.local', name: 'Test Lead' },
  { role: 'Tester', email: 'tester@testsphere.local', name: 'Tester' },
  { role: 'Developer', email: 'developer@testsphere.local', name: 'Developer' },
  { role: 'Product Owner', email: 'business.approver@testsphere.local', name: 'Product Owner' },
  { role: 'Automation Engineer', email: 'automation.engineer@testsphere.local', name: 'Automation Engineer' },
  { role: 'Database Test Engineer', email: 'database.engineer@testsphere.local', name: 'Database Test Engineer' },
  { role: 'UAT Coordinator', email: 'uat.coordinator@testsphere.local', name: 'UAT Coordinator' },
];

// Roles superseded by this consolidation (10 roles -> 6). "Manager"/"Member"
// are leftovers from the original 3-role scheme (pre-dating even the
// 10-role matrix). The rest are demo/seed accounts created earlier this
// session with zero real business data attached -- safe to remove outright
// rather than only-if-unused, unlike a role a real customer might have
// actually assigned. Their permission grants live on in the merged roles
// above; only the redundant role rows and demo user accounts go away.
// 'Test Manager', 'Test Lead' and 'Product Owner' used to be listed here
// (leftovers of the old 10-role table) but are now the CURRENT short names
// of live roles, so they must never be retired/deleted.
const RETIRED_ROLE_NAMES = [
  'Manager',
  'Member',
  'Business Analyst',
  'Auditor',
  'Management',
];

// Renames applied when moving from the 6-role model to the 9-role model --
// migrated via role.update (preserving the role's id, and therefore every
// existing user's roleId) rather than treated as retired/deleted, since
// each of these is the SAME role continuing under a new name, not a role
// being dropped. Checked in order so the Administrator role's full rename
// history (Admin -> System Administrator -> QMICS TestSphere Administrator
// -> System Administrator) migrates forward
// correctly no matter which point in that history a given database is at.
const ROLE_RENAME_CHAINS = {
  'System Administrator': ['Admin', 'QMICS TestSphere Administrator'],
  'Test Manager': ['QA Manager', 'Test Manager / Test Program Manager'],
  'Test Lead': ['Test Lead / Test Manager', 'Test Lead / QA Lead'],
  Tester: ['Tester / Test Engineer / QA Engineer'],
  'UAT Coordinator': ['UAT Coordinator / Business Tester'],
  'Product Owner': ['Business/Release Approver', 'Product Owner / Release Approver'],
};

async function ensureRole(name, isSystem, description) {
  for (const priorName of ROLE_RENAME_CHAINS[name] ?? []) {
    const legacy = await prisma.role.findUnique({ where: { name: priorName } });
    if (legacy) {
      return prisma.role.update({
        where: { id: legacy.id },
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
