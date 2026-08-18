// One-time bootstrap: creates the "QMICS" organization and the 18 real
// products for it. Names/descriptions/status/environment/release/metrics are
// transcribed verbatim from frontend/src/data/mockProducts.ts -- that file is
// the source of truth for "the exact 18 product names already defined for
// the company's QMICS products". Run once via `node prisma/seed-products.cjs`
// (after `npm run build`, since it requires the compiled Prisma client, same
// as prisma/seed.cjs).
const path = require('path');
const { PrismaClient } = require(
  path.join(__dirname, '..', 'dist', 'generated', 'prisma', 'client.js'),
);
const { PrismaPg } = require(
  path.join(__dirname, '..', 'node_modules', '@prisma', 'adapter-pg'),
);

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    options: '-c timezone=UTC',
  }),
});

const ORG_NAME = 'QMICS';

const STATUS_MAP = { Active: 'ACTIVE', 'On Hold': 'ON_HOLD', Deprecated: 'DEPRECATED' };
const READINESS_MAP = { Ready: 'READY', Conditional: 'CONDITIONAL', 'Not Ready': 'NOT_READY' };

// Transcribed verbatim from frontend/src/data/mockProducts.ts.
const PRODUCTS = [
  { name: 'QMICS Compliance Manager', description: 'Regulatory compliance tracking and audit readiness platform.', status: 'Active', environment: 'Production', release: 'v4.2.0', testCoverage: 87, passRate: 94, openDefects: 6, releaseReadiness: 'Ready' },
  { name: 'QMICS Audit Manager', description: 'End-to-end internal and external audit lifecycle management.', status: 'Active', environment: 'Production', release: 'v3.8.1', testCoverage: 81, passRate: 91, openDefects: 9, releaseReadiness: 'Ready' },
  { name: 'QMICS Performance Manager', description: 'Employee performance appraisal and goal tracking system.', status: 'Active', environment: 'Staging', release: 'v2.5.0', testCoverage: 74, passRate: 88, openDefects: 14, releaseReadiness: 'Conditional' },
  { name: 'QMICS Laboratory Manager', description: 'LIMS for sample tracking, testing workflows and result reporting.', status: 'Active', environment: 'Production', release: 'v5.1.2', testCoverage: 90, passRate: 96, openDefects: 3, releaseReadiness: 'Ready' },
  { name: 'QMICS HR Management Suite', description: 'Core HR, onboarding, and workforce administration platform.', status: 'Active', environment: 'Production', release: 'v6.0.0', testCoverage: 78, passRate: 89, openDefects: 11, releaseReadiness: 'Conditional' },
  { name: 'QMICS Asset Management', description: 'Fixed asset tracking, depreciation, and lifecycle management.', status: 'Active', environment: 'QA', release: 'v1.9.4', testCoverage: 65, passRate: 82, openDefects: 18, releaseReadiness: 'Not Ready' },
  { name: 'QMICS Document Control', description: 'Controlled document authoring, review, and approval workflows.', status: 'Active', environment: 'Production', release: 'v3.3.0', testCoverage: 83, passRate: 92, openDefects: 7, releaseReadiness: 'Ready' },
  { name: 'QMICS Risk Management', description: 'Enterprise risk register, assessment, and mitigation tracking.', status: 'On Hold', environment: 'Staging', release: 'v1.4.0', testCoverage: 58, passRate: 76, openDefects: 21, releaseReadiness: 'Not Ready' },
  { name: 'QMICS Incident Management', description: 'Incident logging, investigation, and CAPA linkage.', status: 'Active', environment: 'Production', release: 'v2.7.3', testCoverage: 80, passRate: 90, openDefects: 10, releaseReadiness: 'Ready' },
  { name: 'QMICS Training Management', description: 'Employee training plans, certifications, and compliance tracking.', status: 'Active', environment: 'UAT', release: 'v2.1.0', testCoverage: 71, passRate: 85, openDefects: 13, releaseReadiness: 'Conditional' },
  { name: 'QMICS Vendor Management', description: 'Supplier qualification, scorecards, and contract tracking.', status: 'Active', environment: 'Production', release: 'v1.6.2', testCoverage: 76, passRate: 87, openDefects: 12, releaseReadiness: 'Conditional' },
  { name: 'QMICS Calibration Manager', description: 'Equipment calibration scheduling and certificate management.', status: 'Active', environment: 'Production', release: 'v3.0.1', testCoverage: 85, passRate: 93, openDefects: 5, releaseReadiness: 'Ready' },
  { name: 'QMICS CAPA Manager', description: 'Corrective and preventive action workflow management.', status: 'Active', environment: 'QA', release: 'v1.2.0', testCoverage: 62, passRate: 79, openDefects: 19, releaseReadiness: 'Not Ready' },
  { name: 'QMICS Change Control', description: 'Change request evaluation, approval, and impact tracking.', status: 'Active', environment: 'Production', release: 'v2.0.5', testCoverage: 79, passRate: 88, openDefects: 10, releaseReadiness: 'Ready' },
  { name: 'QMICS Inventory Manager', description: 'Warehouse stock tracking and reorder management.', status: 'Deprecated', environment: 'Development', release: 'v0.9.8', testCoverage: 40, passRate: 61, openDefects: 27, releaseReadiness: 'Not Ready' },
  { name: 'QMICS Maintenance Manager', description: 'Preventive and corrective equipment maintenance scheduling.', status: 'Active', environment: 'Staging', release: 'v1.8.0', testCoverage: 69, passRate: 84, openDefects: 15, releaseReadiness: 'Conditional' },
  { name: 'QMICS Customer Portal', description: 'Self-service customer support and ticketing portal.', status: 'Active', environment: 'Production', release: 'v4.5.0', testCoverage: 88, passRate: 95, openDefects: 4, releaseReadiness: 'Ready' },
  { name: 'QMICS Analytics Hub', description: 'Cross-product business intelligence and reporting dashboards.', status: 'Active', environment: 'UAT', release: 'v1.0.0', testCoverage: 55, passRate: 74, openDefects: 22, releaseReadiness: 'Not Ready' },
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { name: ORG_NAME },
    update: {},
    create: { name: ORG_NAME, description: 'QMICS product suite.' },
  });
  console.log(`Organization "${ORG_NAME}": ${org.id}`);

  let created = 0;
  let skipped = 0;
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { organizationId: org.id, name: p.name },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.product.create({
      data: {
        organizationId: org.id,
        name: p.name,
        description: p.description,
        status: STATUS_MAP[p.status],
        environment: p.environment,
        release: p.release,
        testCoverage: p.testCoverage,
        passRate: p.passRate,
        openDefects: p.openDefects,
        releaseReadiness: READINESS_MAP[p.releaseReadiness],
      },
    });
    created++;
  }
  console.log(`Created ${created} product(s), skipped ${skipped} already-existing.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
