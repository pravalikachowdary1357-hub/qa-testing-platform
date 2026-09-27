import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { OPEN_DEFECT_STATUSES } from '../defects/defect-status';
import { ReleaseQualityService } from '../release-quality/release-quality.service';

// Role "My Work" dashboards. Each testing role opens to a dashboard built
// from its own section of the QMICS TestSphere Roles & Responsibilities
// document. Every figure is computed from records the role is allowed to
// see (permission-checked below), scoped to the selected product and the
// user's organization.

export type RoleKey =
  | 'TEST_MANAGER'
  | 'TEST_LEAD'
  | 'TESTER'
  | 'AUTOMATION_ENGINEER'
  | 'DATABASE_TEST_ENGINEER'
  | 'DEVELOPER'
  | 'UAT_COORDINATOR'
  | 'PRODUCT_OWNER'
  | 'OTHER';

const ROLE_KEYS: Record<string, RoleKey> = {
  'Test Manager': 'TEST_MANAGER',
  'Test Lead': 'TEST_LEAD',
  Tester: 'TESTER',
  'Automation Engineer': 'AUTOMATION_ENGINEER',
  'Database Test Engineer': 'DATABASE_TEST_ENGINEER',
  Developer: 'DEVELOPER',
  'UAT Coordinator': 'UAT_COORDINATOR',
  'Product Owner': 'PRODUCT_OWNER',
};

// Primary responsibility per role, from the Roles & Responsibilities
// document (sections 3, 4, 6, 7, 11, 12, 20 and 22).
const FOCUS: Record<
  RoleKey,
  { title: string; focus: string; responsibilities: string[] }
> = {
  TEST_MANAGER: {
    title: 'Test management overview',
    focus:
      'Overall ownership of the testing strategy, test governance, resources, schedule, quality risks and testing outcomes.',
    responsibilities: [
      'Monitor testing progress',
      'Review test coverage',
      'Monitor defect trends',
      'Review critical and high-severity defects',
      'Support release/go-live decisions',
      'Establish testing KPIs',
    ],
  },
  TEST_LEAD: {
    title: 'Test lead workspace',
    focus: 'Manage day-to-day testing activities and coordinate testers.',
    responsibilities: [
      'Review test cases',
      'Monitor test execution',
      'Monitor defect resolution',
      'Escalate critical defects',
      'Review regression testing',
      'Verify testing completion',
    ],
  },
  TESTER: {
    title: 'My testing work',
    focus: 'Design and execute manual tests and document results.',
    responsibilities: [
      'Execute test cases',
      'Record actual results',
      'Report defects',
      'Retest corrected defects',
      'Execute regression tests',
      'Verify defect fixes',
    ],
  },
  AUTOMATION_ENGINEER: {
    title: 'Automation workspace',
    focus: 'Design, develop and maintain automated testing solutions.',
    responsibilities: [
      'Create automated test scripts',
      'Execute automated regression tests',
      'Analyze automation failures',
      'Maintain test scripts',
      'Improve automation coverage',
    ],
  },
  DATABASE_TEST_ENGINEER: {
    title: 'Database testing',
    focus:
      'Validate database structures, data integrity, migrations, stored procedures and ETL processes.',
    responsibilities: [
      'Validate database structures',
      'Verify data integrity',
      'Validate data migration',
      'Test stored procedures',
      'Validate ETL processes',
    ],
  },
  DEVELOPER: {
    title: 'My defects',
    focus: 'Fix defects, analyse failed tests and support root-cause analysis.',
    responsibilities: [
      'Fix defects',
      'Analyze failed tests',
      'Participate in defect triage',
      'Support root-cause analysis',
      'Support regression testing',
    ],
  },
  UAT_COORDINATOR: {
    title: 'User acceptance testing',
    focus: 'Coordinate User Acceptance Testing and obtain UAT acceptance.',
    responsibilities: [
      'Manage UAT execution',
      'Record business-user feedback',
      'Coordinate defect resolution',
      'Obtain UAT acceptance',
      'Prepare UAT completion report',
    ],
  },
  PRODUCT_OWNER: {
    title: 'Approvals & acceptance',
    focus:
      'Define requirements and acceptance criteria, review product releases and give acceptance.',
    responsibilities: [
      'Define acceptance criteria',
      'Maintain product backlog',
      'Review product releases',
      'Coordinate with QA',
    ],
  },
  OTHER: {
    title: 'My work',
    focus: 'Your dashboard shows the areas your role has access to.',
    responsibilities: [],
  },
};

const REQUIRED: Partial<Record<RoleKey, string[]>> = {
  TEST_MANAGER: [
    'defects:read',
    'test_executions:read',
    'test_plans:read',
    'requirements:read',
  ],
  TEST_LEAD: [
    'defects:read',
    'test_executions:read',
    'test_cases:read',
    'test_scenarios:read',
  ],
  TESTER: ['defects:read', 'test_executions:read'],
  AUTOMATION_ENGINEER: ['automation:read'],
  DEVELOPER: ['defects:read'],
  UAT_COORDINATOR: ['uat:read'],
  PRODUCT_OWNER: ['requirements:read', 'uat:read', 'release_quality:read'],
};

type Tone = 'default' | 'success' | 'warning' | 'error';
export interface Tile {
  key: string;
  label: string;
  value: string | number;
  tone?: Tone;
  link?: string;
  hint?: string;
}
export interface ListItem {
  id: string;
  title: string;
  meta?: string;
  status?: string;
  link?: string;
}
export interface WorkList {
  key: string;
  title: string;
  link?: string;
  emptyText: string;
  items: ListItem[];
}

const DAY = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 8;
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
const ageDays = (d: Date) =>
  Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY));
const label = (v: string) =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');

@Injectable()
export class MyWorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly releaseQuality: ReleaseQualityService,
  ) {}

  async get(actor: AuthenticatedUser, productId: string | undefined) {
    const role = ROLE_KEYS[actor.roleName] ?? 'OTHER';
    const product = productId
      ? await this.productInScope(productId, actor)
      : null;
    const can = (k: string) => actor.permissions.includes(k);
    const base = { role, roleName: actor.roleName, ...FOCUS[role], product };

    if (role === 'DATABASE_TEST_ENGINEER') {
      // No database-testing module exists yet and the role holds no
      // permissions, so it is shown no testing data at all.
      return {
        ...base,
        notice:
          'Database testing (schemas, data integrity, migrations, stored procedures, ETL) is a planned TestSphere capability. Your role will get its workspace when that module is released.',
        tiles: [] as Tile[],
        lists: [] as WorkList[],
      };
    }
    if (!product) {
      return {
        ...base,
        notice: 'Select a product to see your work.',
        tiles: [] as Tile[],
        lists: [] as WorkList[],
      };
    }

    const ctx = { actor, productId: product.id, can };
    // A renamed or edited role may lack what its dashboard reads; it then
    // gets the permission-based dashboard instead of data it cannot open.
    const needs = REQUIRED[role] ?? [];
    if (!needs.every(can)) return { ...base, ...(await this.generic(ctx)) };
    switch (role) {
      case 'TEST_MANAGER':
        return { ...base, ...(await this.testManager(ctx)) };
      case 'TEST_LEAD':
        return { ...base, ...(await this.testLead(ctx)) };
      case 'TESTER':
        return { ...base, ...(await this.tester(ctx)) };
      case 'AUTOMATION_ENGINEER':
        return { ...base, ...(await this.automation(ctx)) };
      case 'DEVELOPER':
        return { ...base, ...(await this.developer(ctx)) };
      case 'UAT_COORDINATOR':
        return { ...base, ...(await this.uat(ctx)) };
      case 'PRODUCT_OWNER':
        return { ...base, ...(await this.productOwner(ctx)) };
      default:
        return { ...base, ...(await this.generic(ctx)) };
    }
  }

  // ------------------------------------------------------------ helpers

  private async productInScope(productId: string, actor: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, organizationId: true },
    });
    if (
      !product ||
      (actor.organizationId && product.organizationId !== actor.organizationId)
    ) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return { id: product.id, name: product.name };
  }

  // "Assigned to" / "executed by" are free text: they count as "me" when
  // they equal the user's email or full name (case-insensitive).
  private mine(actor: AuthenticatedUser) {
    return [
      { equals: actor.email, mode: 'insensitive' as const },
      { equals: actor.name, mode: 'insensitive' as const },
    ];
  }

  private async executionSummary(productId: string) {
    const cases = await this.prisma.testCase.findMany({
      where: { testScenario: { productId } },
      select: {
        id: true,
        testExecutions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });
    const counts = {
      total: cases.length,
      pass: 0,
      fail: 0,
      blocked: 0,
      notRun: 0,
    };
    for (const c of cases) {
      const s = c.testExecutions[0]?.status;
      if (s === 'PASS') counts.pass++;
      else if (s === 'FAIL') counts.fail++;
      else if (s === 'BLOCKED') counts.blocked++;
      else counts.notRun++;
    }
    return counts;
  }

  private defectItem(d: {
    id: string;
    title: string;
    severity: string;
    status: string;
    createdAt: Date;
    assignedTo?: string | null;
  }): ListItem {
    return {
      id: d.id,
      title: d.title,
      meta: `${label(d.severity)} · ${ageDays(d.createdAt)} day(s) old${d.assignedTo ? ` · ${d.assignedTo}` : ''}`,
      status: d.status,
      link: '/defects',
    };
  }

  // ------------------------------------------------------------ roles

  private async testManager({ productId, can }: Ctx) {
    const [
      quality,
      exec,
      openDefects,
      reopened,
      plansInReview,
      reqInReview,
      totalReq,
    ] = await Promise.all([
      can('release_quality:read')
        ? this.releaseQuality.getProductQuality(productId)
        : null,
      this.executionSummary(productId),
      this.prisma.defect.findMany({
        where: { productId, status: { in: OPEN_DEFECT_STATUSES } },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          createdAt: true,
          assignedTo: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.defect.count({ where: { productId, status: 'REOPENED' } }),
      this.prisma.testPlan.findMany({
        where: { productId, status: 'IN_REVIEW' },
        select: { id: true, name: true, updatedAt: true, owner: true },
        take: LIST_LIMIT,
      }),
      this.prisma.requirement.count({
        where: { productId, status: 'IN_REVIEW' },
      }),
      this.prisma.requirement.count({ where: { productId } }),
    ]);
    const severe = openDefects.filter(
      (d) => d.severity === 'CRITICAL' || d.severity === 'MAJOR',
    );
    const avgAge = openDefects.length
      ? Math.round(
          openDefects.reduce((s, d) => s + ageDays(d.createdAt), 0) /
            openDefects.length,
        )
      : 0;
    const executed = exec.total - exec.notRun;
    const readiness = quality?.readiness;
    return {
      tiles: [
        {
          key: 'reqCoverage',
          label: 'Requirement coverage',
          value: `${quality?.requirementCoverage?.requirementCoveragePercent ?? 0}%`,
          link: '/traceability',
          hint: `${totalReq} requirement(s)`,
        },
        {
          key: 'testCompletion',
          label: 'Test completion',
          value: `${pct(executed, exec.total)}%`,
          hint: `${executed} of ${exec.total} test cases executed`,
          link: '/test-execution',
        },
        {
          key: 'passRate',
          label: 'Pass rate',
          value: `${pct(exec.pass, executed)}%`,
          tone: exec.fail > 0 ? 'warning' : 'success',
          link: '/reports',
        },
        {
          key: 'openDefects',
          label: 'Open defects',
          value: openDefects.length,
          link: '/defects',
        },
        {
          key: 'severe',
          label: 'Critical / high open',
          value: severe.length,
          tone: severe.length ? 'error' : 'success',
          link: '/defects',
        },
        {
          key: 'aging',
          label: 'Average defect age',
          value: `${avgAge} d`,
          tone: avgAge > 14 ? 'warning' : 'default',
          link: '/defects',
        },
        {
          key: 'reopened',
          label: 'Reopened defects',
          value: reopened,
          tone: reopened ? 'warning' : 'default',
          link: '/defects',
        },
        {
          key: 'readiness',
          label: 'Release readiness',
          value: readiness ? label(readiness) : '—',
          tone:
            readiness === 'READY'
              ? 'success'
              : readiness === 'CONDITIONAL'
                ? 'warning'
                : 'error',
          link: '/release-quality',
        },
      ] as Tile[],
      lists: [
        {
          key: 'severe',
          title: 'Critical and high-severity defects to review',
          link: '/defects',
          emptyText: 'No open critical or major defects.',
          items: severe.slice(0, LIST_LIMIT).map((d) => this.defectItem(d)),
        },
        {
          key: 'approvals',
          title: `Waiting for approval (${plansInReview.length} test plan(s), ${reqInReview} requirement(s))`,
          link: '/test-planning',
          emptyText: 'Nothing is waiting for your approval.',
          items: plansInReview.map((p) => ({
            id: p.id,
            title: p.name,
            meta: `Test plan · owner ${p.owner} · in review ${ageDays(p.updatedAt)} day(s)`,
            status: 'IN_REVIEW',
            link: '/test-planning',
          })),
        },
      ] as WorkList[],
    };
  }

  private async testLead({ productId }: Ctx) {
    const [exec, casesToReview, untriaged, awaitingRetest, severe, regression] =
      await Promise.all([
        this.executionSummary(productId),
        this.prisma.testCase.findMany({
          where: { testScenario: { productId }, status: 'READY' },
          select: { id: true, title: true, priority: true, updatedAt: true },
          take: LIST_LIMIT,
          orderBy: { updatedAt: 'asc' },
        }),
        this.prisma.defect.findMany({
          where: {
            productId,
            status: { in: ['NEW', 'OPEN'] },
            OR: [{ assignedTo: null }, { assignedTo: '' }],
          },
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          take: LIST_LIMIT,
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.defect.count({
          where: {
            productId,
            status: { in: ['FIXED', 'READY_FOR_RETEST', 'RESOLVED'] },
          },
        }),
        this.prisma.defect.count({
          where: {
            productId,
            status: { in: OPEN_DEFECT_STATUSES },
            severity: 'CRITICAL',
          },
        }),
        this.prisma.testScenario.count({
          where: { productId, type: 'REGRESSION' },
        }),
      ]);
    const executed = exec.total - exec.notRun;
    return {
      tiles: [
        {
          key: 'progress',
          label: 'Execution progress',
          value: `${pct(executed, exec.total)}%`,
          hint: `${executed} of ${exec.total} executed`,
          link: '/test-execution',
        },
        {
          key: 'failed',
          label: 'Failed',
          value: exec.fail,
          tone: exec.fail ? 'error' : 'success',
          link: '/test-execution',
        },
        {
          key: 'blocked',
          label: 'Blocked',
          value: exec.blocked,
          tone: exec.blocked ? 'warning' : 'default',
          link: '/test-execution',
        },
        {
          key: 'notRun',
          label: 'Not executed',
          value: exec.notRun,
          link: '/test-execution',
        },
        {
          key: 'review',
          label: 'Test cases to review',
          value: casesToReview.length,
          tone: casesToReview.length ? 'warning' : 'default',
          link: '/test-cases',
        },
        {
          key: 'untriaged',
          label: 'Unassigned new defects',
          value: untriaged.length,
          tone: untriaged.length ? 'warning' : 'default',
          link: '/defects',
        },
        {
          key: 'retest',
          label: 'Fixed, awaiting retest',
          value: awaitingRetest,
          link: '/defects',
        },
        {
          key: 'critical',
          label: 'Critical defects to escalate',
          value: severe,
          tone: severe ? 'error' : 'success',
          link: '/defects',
        },
        {
          key: 'regression',
          label: 'Regression scenarios',
          value: regression,
          link: '/test-scenarios',
        },
      ] as Tile[],
      lists: [
        {
          key: 'review',
          title: 'Test cases ready for review',
          link: '/test-cases',
          emptyText: 'No test cases are waiting for review.',
          items: casesToReview.map((c) => ({
            id: c.id,
            title: c.title,
            meta: `${label(c.priority)} priority`,
            status: 'READY',
            link: '/test-cases',
          })),
        },
        {
          key: 'untriaged',
          title: 'New defects without an assignee',
          link: '/defects',
          emptyText: 'Every new defect is assigned.',
          items: untriaged.map((d) => this.defectItem(d)),
        },
      ] as WorkList[],
    };
  }

  private async tester({ actor, productId }: Ctx) {
    const since = new Date(Date.now() - 30 * DAY);
    const [myExecutions, retest, exec] = await Promise.all([
      this.prisma.testExecution.findMany({
        where: {
          testCase: { testScenario: { productId } },
          OR: this.mine(actor).map((m) => ({ executedBy: m })),
          executedAt: { gte: since },
        },
        select: {
          id: true,
          status: true,
          executedAt: true,
          testCase: { select: { title: true } },
          environment: { select: { name: true } },
        },
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.defect.findMany({
        where: { productId, status: { in: ['FIXED', 'READY_FOR_RETEST'] } },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          createdAt: true,
          assignedTo: true,
        },
        take: LIST_LIMIT,
        orderBy: { updatedAt: 'asc' },
      }),
      this.executionSummary(productId),
    ]);
    const count = (s: string) =>
      myExecutions.filter((e) => e.status === s).length;
    const attention = myExecutions.filter(
      (e) => e.status === 'FAIL' || e.status === 'BLOCKED',
    );
    return {
      tiles: [
        {
          key: 'mine',
          label: 'My executions (30 days)',
          value: myExecutions.length,
          link: '/test-execution',
        },
        {
          key: 'pass',
          label: 'Passed',
          value: count('PASS'),
          tone: 'success',
          link: '/test-execution',
        },
        {
          key: 'fail',
          label: 'Failed',
          value: count('FAIL'),
          tone: count('FAIL') ? 'error' : 'default',
          link: '/test-execution',
        },
        {
          key: 'blocked',
          label: 'Blocked',
          value: count('BLOCKED'),
          tone: count('BLOCKED') ? 'warning' : 'default',
          link: '/test-execution',
        },
        {
          key: 'retest',
          label: 'Defects to retest',
          value: retest.length,
          tone: retest.length ? 'warning' : 'default',
          link: '/defects',
        },
        {
          key: 'notRun',
          label: 'Product test cases not executed',
          value: exec.notRun,
          link: '/test-cases',
        },
      ] as Tile[],
      lists: [
        {
          key: 'retest',
          title: 'Fixed defects waiting for your retest',
          link: '/defects',
          emptyText: 'No defects are waiting for retest.',
          items: retest.map((d) => this.defectItem(d)),
        },
        {
          key: 'attention',
          title: 'My failed and blocked executions',
          link: '/test-execution',
          emptyText: 'None of your recent executions failed or were blocked.',
          items: attention.slice(0, LIST_LIMIT).map((e) => ({
            id: e.id,
            title: e.testCase.title,
            meta: `${e.environment.name} · ${e.executedAt.toISOString().slice(0, 10)}`,
            status: e.status,
            link: '/test-execution',
          })),
        },
      ] as WorkList[],
    };
  }

  private async automation({ productId }: Ctx) {
    const [scripts, totalCases] = await Promise.all([
      this.prisma.automation.findMany({
        where: { testCase: { testScenario: { productId } } },
        select: {
          id: true,
          name: true,
          enabled: true,
          lastRunStatus: true,
          lastRunAt: true,
          framework: true,
          testCaseId: true,
        },
      }),
      this.prisma.testCase.count({ where: { testScenario: { productId } } }),
    ]);
    const enabled = scripts.filter((s) => s.enabled);
    const ran = enabled.filter((s) => s.lastRunStatus !== 'NOT_RUN');
    const pass = ran.filter((s) => s.lastRunStatus === 'PASS').length;
    const failing = enabled.filter(
      (s) => s.lastRunStatus === 'FAIL' || s.lastRunStatus === 'BLOCKED',
    );
    const stale = enabled.filter(
      (s) => !s.lastRunAt || ageDays(s.lastRunAt) > 7,
    );
    const automatedCases = new Set(scripts.map((s) => s.testCaseId)).size;
    return {
      tiles: [
        {
          key: 'scripts',
          label: 'Automated scripts',
          value: scripts.length,
          hint: `${enabled.length} enabled`,
          link: '/automation',
        },
        {
          key: 'coverage',
          label: 'Automation coverage',
          value: `${pct(automatedCases, totalCases)}%`,
          hint: `${automatedCases} of ${totalCases} test cases`,
          link: '/automation',
        },
        {
          key: 'passRate',
          label: 'Last-run pass rate',
          value: `${pct(pass, ran.length)}%`,
          tone: failing.length ? 'warning' : 'success',
          link: '/automation',
        },
        {
          key: 'failing',
          label: 'Failing scripts',
          value: failing.length,
          tone: failing.length ? 'error' : 'success',
          link: '/automation',
        },
        {
          key: 'stale',
          label: 'Not run in 7 days',
          value: stale.length,
          tone: stale.length ? 'warning' : 'default',
          link: '/automation',
        },
      ] as Tile[],
      lists: [
        {
          key: 'failing',
          title: 'Automation failures to analyse',
          link: '/automation',
          emptyText: 'No enabled script is failing.',
          items: failing.slice(0, LIST_LIMIT).map((s) => ({
            id: s.id,
            title: s.name,
            meta: `${label(s.framework)}${s.lastRunAt ? ` · last run ${s.lastRunAt.toISOString().slice(0, 10)}` : ''}`,
            status: s.lastRunStatus,
            link: '/automation',
          })),
        },
      ] as WorkList[],
    };
  }

  private async developer({ actor, productId }: Ctx) {
    const mineWhere = {
      productId,
      OR: this.mine(actor).map((m) => ({ assignedTo: m })),
    };
    const [assigned, reopened, retestQueue, untriagedSevere] =
      await Promise.all([
        this.prisma.defect.findMany({
          where: { ...mineWhere, status: { in: OPEN_DEFECT_STATUSES } },
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.defect.count({
          where: { ...mineWhere, status: 'REOPENED' },
        }),
        this.prisma.defect.count({
          where: {
            ...mineWhere,
            status: { in: ['FIXED', 'READY_FOR_RETEST'] },
          },
        }),
        this.prisma.defect.findMany({
          where: {
            productId,
            status: { in: ['NEW', 'OPEN'] },
            severity: { in: ['CRITICAL', 'MAJOR'] },
            OR: [{ assignedTo: null }, { assignedTo: '' }],
          },
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            createdAt: true,
          },
          take: LIST_LIMIT,
          orderBy: { createdAt: 'asc' },
        }),
      ]);
    const critical = assigned.filter((d) => d.severity === 'CRITICAL').length;
    const inProgress = assigned.filter(
      (d) => d.status === 'IN_PROGRESS',
    ).length;
    return {
      tiles: [
        {
          key: 'assigned',
          label: 'Assigned to me (open)',
          value: assigned.length,
          link: '/defects',
        },
        {
          key: 'critical',
          label: 'Critical',
          value: critical,
          tone: critical ? 'error' : 'success',
          link: '/defects',
        },
        {
          key: 'inProgress',
          label: 'In progress',
          value: inProgress,
          link: '/defects',
        },
        {
          key: 'reopened',
          label: 'Reopened',
          value: reopened,
          tone: reopened ? 'warning' : 'default',
          link: '/defects',
        },
        {
          key: 'retest',
          label: 'Fixed, awaiting retest',
          value: retestQueue,
          link: '/defects',
        },
        {
          key: 'triage',
          label: 'Severe defects to triage',
          value: untriagedSevere.length,
          tone: untriagedSevere.length ? 'warning' : 'default',
          link: '/defects',
        },
      ] as Tile[],
      lists: [
        {
          key: 'assigned',
          title: 'My open defects (most severe first)',
          link: '/defects',
          emptyText: `No open defects are assigned to you. Defects count as yours when "Assigned to" is your name or email (${actor.email}).`,
          items: assigned.slice(0, LIST_LIMIT).map((d) => this.defectItem(d)),
        },
        {
          key: 'triage',
          title: 'Unassigned critical / major defects (triage)',
          link: '/defects',
          emptyText: 'No severe defects are waiting for triage.',
          items: untriagedSevere.map((d) => this.defectItem(d)),
        },
      ] as WorkList[],
    };
  }

  private async uat({ productId }: Ctx) {
    const cycles = await this.prisma.uatCycle.findMany({
      where: { productId },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        testCases: {
          select: {
            executions: {
              orderBy: { executedAt: 'desc' },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    let cases = 0,
      pass = 0,
      fail = 0,
      blocked = 0,
      notRun = 0;
    const rows = cycles.map((c) => {
      let cp = 0,
        ce = 0;
      for (const tc of c.testCases) {
        cases++;
        const s = tc.executions[0]?.status;
        if (s === 'PASS') {
          pass++;
          cp++;
          ce++;
        } else if (s === 'FAIL') {
          fail++;
          ce++;
        } else if (s === 'BLOCKED') {
          blocked++;
          ce++;
        } else if (s === 'NOT_APPLICABLE') {
          ce++;
        } else notRun++;
      }
      return { c, progress: pct(ce, c.testCases.length), passed: cp };
    });
    const active = rows.filter(
      (r) => r.c.status === 'PLANNED' || r.c.status === 'IN_PROGRESS',
    );
    const awaiting = rows.filter((r) => r.c.status === 'COMPLETED');
    return {
      tiles: [
        {
          key: 'active',
          label: 'Active UAT cycles',
          value: active.length,
          link: '/uat',
        },
        {
          key: 'completion',
          label: 'UAT completion',
          value: `${pct(cases - notRun, cases)}%`,
          hint: `${cases - notRun} of ${cases} UAT cases executed`,
          link: '/uat',
        },
        {
          key: 'pass',
          label: 'Passed',
          value: pass,
          tone: 'success',
          link: '/uat',
        },
        {
          key: 'fail',
          label: 'Failed',
          value: fail,
          tone: fail ? 'error' : 'default',
          link: '/uat',
        },
        {
          key: 'blocked',
          label: 'Blocked',
          value: blocked,
          tone: blocked ? 'warning' : 'default',
          link: '/uat',
        },
        {
          key: 'signoff',
          label: 'Awaiting sign-off',
          value: awaiting.length,
          tone: awaiting.length ? 'warning' : 'default',
          link: '/uat',
        },
      ] as Tile[],
      lists: [
        {
          key: 'cycles',
          title: 'UAT cycles in progress',
          link: '/uat',
          emptyText: 'No UAT cycle is in progress.',
          items: active.slice(0, LIST_LIMIT).map((r) => ({
            id: r.c.id,
            title: r.c.name,
            meta: `${r.progress}% executed · ${r.passed} passed of ${r.c.testCases.length}`,
            status: r.c.status,
            link: '/uat',
          })),
        },
        {
          key: 'signoff',
          title: 'Completed cycles waiting for UAT acceptance',
          link: '/uat',
          emptyText: 'No UAT cycle is waiting for sign-off.',
          items: awaiting.slice(0, LIST_LIMIT).map((r) => ({
            id: r.c.id,
            title: r.c.name,
            meta: `Completed ${ageDays(r.c.updatedAt)} day(s) ago`,
            status: r.c.status,
            link: '/uat',
          })),
        },
      ] as WorkList[],
    };
  }

  private async productOwner({ productId, can }: Ctx) {
    const [reqs, uatAwaiting, releases, criteriaMissing] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { productId, status: 'IN_REVIEW' },
        select: { id: true, title: true, priority: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: LIST_LIMIT,
      }),
      this.prisma.uatCycle.findMany({
        where: { productId, status: 'COMPLETED' },
        select: { id: true, name: true, updatedAt: true },
        take: LIST_LIMIT,
      }),
      this.prisma.release.findMany({
        where: {
          productId,
          status: { in: ['PLANNED', 'IN_TESTING', 'COMPLETED'] },
        },
        select: {
          id: true,
          name: true,
          version: true,
          status: true,
          releaseDate: true,
        },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.requirement.count({
        where: { productId, acceptanceCriteria: { none: {} } },
      }),
    ]);
    const quality = can('release_quality:read')
      ? await this.releaseQuality.getProductQuality(productId)
      : null;
    const releasesAwaiting = releases.filter((r) => r.status === 'COMPLETED');
    const readiness = quality?.readiness;
    return {
      tiles: [
        {
          key: 'reviews',
          label: 'Requirements to review',
          value: reqs.length,
          tone: reqs.length ? 'warning' : 'default',
          link: '/requirements',
        },
        {
          key: 'uat',
          label: 'UAT sign-offs waiting',
          value: uatAwaiting.length,
          tone: uatAwaiting.length ? 'warning' : 'default',
          link: '/uat',
        },
        {
          key: 'releases',
          label: 'Release sign-offs waiting',
          value: releasesAwaiting.length,
          tone: releasesAwaiting.length ? 'warning' : 'default',
          link: '/release-quality',
        },
        {
          key: 'criteria',
          label: 'Requirements without acceptance criteria',
          value: criteriaMissing,
          tone: criteriaMissing ? 'warning' : 'success',
          link: '/requirements',
        },
        {
          key: 'readiness',
          label: 'Release readiness',
          value: readiness ? label(readiness) : '—',
          tone:
            readiness === 'READY'
              ? 'success'
              : readiness === 'CONDITIONAL'
                ? 'warning'
                : 'error',
          link: '/release-quality',
        },
      ] as Tile[],
      lists: [
        {
          key: 'approvals',
          title: 'Waiting for your decision',
          emptyText: 'Nothing is waiting for your approval.',
          items: [
            ...reqs.map((r) => ({
              id: r.id,
              title: r.title,
              meta: `Requirement review · waiting ${ageDays(r.updatedAt)} day(s)`,
              status: 'IN_REVIEW',
              link: '/requirements',
            })),
            ...uatAwaiting.map((c) => ({
              id: c.id,
              title: c.name,
              meta: 'UAT acceptance',
              status: 'COMPLETED',
              link: '/uat',
            })),
            ...releasesAwaiting.map((r) => ({
              id: r.id,
              title: `${r.name} ${r.version}`,
              meta: 'Release sign-off',
              status: 'COMPLETED',
              link: '/release-quality',
            })),
          ].slice(0, LIST_LIMIT),
        },
        {
          key: 'releases',
          title: 'Upcoming releases',
          link: '/release-quality',
          emptyText: 'No release is planned.',
          items: releases.map((r) => ({
            id: r.id,
            title: `${r.name} ${r.version}`,
            meta: r.releaseDate
              ? `Release date ${r.releaseDate.toISOString().slice(0, 10)}`
              : 'No release date',
            status: r.status,
            link: '/release-quality',
          })),
        },
      ] as WorkList[],
    };
  }

  // Custom roles: only what their permissions allow.
  private async generic({ productId, can }: Ctx) {
    const tiles: Tile[] = [];
    if (can('requirements:read'))
      tiles.push({
        key: 'req',
        label: 'Requirements',
        value: await this.prisma.requirement.count({ where: { productId } }),
        link: '/requirements',
      });
    if (can('test_cases:read'))
      tiles.push({
        key: 'tc',
        label: 'Test cases',
        value: await this.prisma.testCase.count({
          where: { testScenario: { productId } },
        }),
        link: '/test-cases',
      });
    if (can('defects:read'))
      tiles.push({
        key: 'def',
        label: 'Open defects',
        value: await this.prisma.defect.count({
          where: { productId, status: { in: OPEN_DEFECT_STATUSES } },
        }),
        link: '/defects',
      });
    return { tiles, lists: [] as WorkList[] };
  }
}

interface Ctx {
  actor: AuthenticatedUser;
  productId: string;
  can: (key: string) => boolean;
}
