import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReleaseQualityService } from '../release-quality/release-quality.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { organizationScopeWhere, productOrganizationScopeWhere } from '../common/organization-scope.util';

// Row-level tables for event-log-shaped data (execution history, automation
// runs, API/performance runs, security findings) are capped so a payload
// can't grow unbounded; entity-inventory-shaped reports (defects, UAT
// cycles, releases, requirements) are returned in full, matching every
// other list page in this app having no pagination.
const ROW_LIMIT = 200;

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

type ResultCounts = { pass: number; fail: number; blocked: number; pending: number; notRun: number };

function emptyResultCounts(): ResultCounts {
  return { pass: 0, fail: 0, blocked: 0, pending: 0, notRun: 0 };
}

// Shared by every "latest execution wins" rollup (test cases, requirements,
// the traceability/overview summaries) -- same semantics as Traceability and
// Release Quality: a test case with no execution in scope is NOT_RUN.
function bumpResultCounts(counts: ResultCounts, status: string | undefined): void {
  switch (status) {
    case 'PASS':
      counts.pass += 1;
      break;
    case 'FAIL':
      counts.fail += 1;
      break;
    case 'BLOCKED':
      counts.blocked += 1;
      break;
    case 'PENDING':
      counts.pending += 1;
      break;
    default:
      counts.notRun += 1;
  }
}

// Same precedence rule as TraceabilityService.getMatrix(): a single failing
// test case fails the whole requirement even if others pass; blocked
// outranks partial progress; "passed" requires every case to pass.
function computeCoverageStatus(counts: ResultCounts, testCaseCount: number): string {
  if (testCaseCount === 0) return 'NOT_COVERED';
  if (counts.fail > 0) return 'FAILED';
  if (counts.blocked > 0) return 'BLOCKED';
  if (counts.pass === testCaseCount) return 'PASSED';
  if (counts.pass > 0 || counts.pending > 0) return 'IN_PROGRESS';
  return 'NOT_EXECUTED';
}

interface DateRange {
  gte?: Date;
  lte?: Date;
}

function buildDateRange(dateFrom?: string, dateTo?: string): DateRange | undefined {
  if (!dateFrom && !dateTo) return undefined;
  const range: DateRange = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) {
    // A bare date (no time) should include the whole day it names.
    const to = new Date(dateTo);
    to.setUTCHours(23, 59, 59, 999);
    range.lte = to;
  }
  return range;
}

function commonFilters(filter: ReportFilterDto) {
  return {
    productId: filter.productId ?? null,
    environmentId: filter.environmentId ?? null,
    dateFrom: filter.dateFrom ?? null,
    dateTo: filter.dateTo ?? null,
  };
}

function validateEnumParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  paramName: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`Invalid ${paramName} '${value}'. Expected one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly releaseQualityService: ReleaseQualityService,
  ) {}

  async getOverview(filter: ReportFilterDto, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId, { allowEnvironment: false });
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);
    const productScope = {
      ...(filter.productId ? { productId: filter.productId } : {}),
      ...productOrganizationScopeWhere(actorOrganizationId),
    };
    const testCaseScope = {
      ...(filter.productId || actorOrganizationId
        ? {
            testScenario: {
              ...(filter.productId ? { productId: filter.productId } : {}),
              ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
            },
          }
        : {}),
    };
    const automationScope = {
      ...(filter.productId || actorOrganizationId
        ? {
            testCase: {
              testScenario: {
                ...(filter.productId ? { productId: filter.productId } : {}),
                ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
              },
            },
          }
        : {}),
    };

    const [
      productCount,
      totalRequirements,
      coveredRequirements,
      testCases,
      defects,
      automations,
      apiRequests,
      performanceTests,
      securityTests,
      uatCycles,
      allReleases,
    ] = await Promise.all([
      this.prisma.product.count({
        where: {
          ...(filter.productId ? { id: filter.productId } : {}),
          ...organizationScopeWhere(actorOrganizationId),
        },
      }),
      this.prisma.requirement.count({ where: productScope }),
      this.prisma.requirement.count({ where: { ...productScope, testScenarios: { some: {} } } }),
      this.prisma.testCase.findMany({ where: testCaseScope, select: { id: true } }),
      this.prisma.defect.findMany({
        where: { ...productScope, createdAt: dateRange },
        select: { severity: true, status: true },
      }),
      this.prisma.automation.findMany({ where: automationScope, select: { lastRunStatus: true } }),
      this.prisma.apiTestRequest.findMany({ where: productScope, select: { id: true } }),
      this.prisma.performanceTest.findMany({ where: productScope, select: { lastRunStatus: true } }),
      this.prisma.securityTest.findMany({ where: productScope, select: { id: true } }),
      this.prisma.uatCycle.findMany({ where: productScope, select: { status: true } }),
      this.releaseQualityService.findAll(filter.productId, actorOrganizationId),
    ]);

    const testCaseIds = testCases.map((testCase) => testCase.id);
    const executions = testCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: testCaseIds }, executedAt: dateRange },
          orderBy: { executedAt: 'desc' },
          select: { testCaseId: true, status: true },
        })
      : [];
    const latestByTestCase = new Map<string, string>();
    for (const execution of executions) {
      if (!latestByTestCase.has(execution.testCaseId)) latestByTestCase.set(execution.testCaseId, execution.status);
    }
    const resultCounts = emptyResultCounts();
    for (const testCase of testCases) bumpResultCounts(resultCounts, latestByTestCase.get(testCase.id));
    const totalTestCases = testCases.length;
    const executedTestCases = totalTestCases - resultCounts.notRun;

    const openStatuses = new Set(['OPEN', 'IN_PROGRESS', 'REOPENED']);
    const openDefects = defects.filter((defect) => openStatuses.has(defect.status));
    const criticalOpenCount = openDefects.filter((defect) => defect.severity === 'CRITICAL').length;

    let automationSummary: { total: number; passRatePercent: number } | null = null;
    if (automations.length > 0) {
      const pass = automations.filter((a) => a.lastRunStatus === 'PASS').length;
      const decided = automations.filter((a) => a.lastRunStatus !== 'NOT_RUN').length;
      automationSummary = { total: automations.length, passRatePercent: percent(pass, decided) };
    }

    let apiTestingSummary: { total: number; passRatePercent: number } | null = null;
    if (apiRequests.length > 0) {
      const apiRequestIds = apiRequests.map((r) => r.id);
      const apiExecutions = await this.prisma.apiTestExecution.findMany({
        where: { apiRequestId: { in: apiRequestIds }, executedAt: dateRange },
        select: { passed: true },
      });
      const evaluated = apiExecutions.filter((e) => e.passed !== null);
      apiTestingSummary = {
        total: apiExecutions.length,
        passRatePercent: percent(evaluated.filter((e) => e.passed === true).length, evaluated.length),
      };
    }

    let performanceSummary: { total: number; passRatePercent: number } | null = null;
    if (performanceTests.length > 0) {
      const decided = performanceTests.filter((t) => t.lastRunStatus === 'PASSED' || t.lastRunStatus === 'FAILED');
      performanceSummary = {
        total: performanceTests.length,
        passRatePercent: percent(decided.filter((t) => t.lastRunStatus === 'PASSED').length, decided.length),
      };
    }

    let securitySummary: { totalFindings: number; openCriticalHighCount: number } | null = null;
    if (securityTests.length > 0) {
      const securityTestIds = securityTests.map((t) => t.id);
      const findings = await this.prisma.securityFinding.findMany({
        where: { securityTestId: { in: securityTestIds }, discoveredAt: dateRange },
        select: { severity: true, status: true },
      });
      securitySummary = {
        totalFindings: findings.length,
        openCriticalHighCount: findings.filter(
          (f) => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && openStatuses.has(f.status),
        ).length,
      };
    }

    let uatSummary: { totalCycles: number; approved: number; rejected: number; pending: number } | null = null;
    if (uatCycles.length > 0) {
      uatSummary = {
        totalCycles: uatCycles.length,
        approved: uatCycles.filter((c) => c.status === 'APPROVED').length,
        rejected: uatCycles.filter((c) => c.status === 'REJECTED').length,
        pending: uatCycles.filter((c) => c.status !== 'APPROVED' && c.status !== 'REJECTED').length,
      };
    }

    const scopedReleases = filter.productId
      ? allReleases.filter((r) => r.productId === filter.productId)
      : allReleases;
    let releaseSummary: { total: number; ready: number; conditional: number; notReady: number } | null = null;
    if (scopedReleases.length > 0) {
      releaseSummary = {
        total: scopedReleases.length,
        ready: scopedReleases.filter((r) => r.quality.readiness === 'READY').length,
        conditional: scopedReleases.filter((r) => r.quality.readiness === 'CONDITIONAL').length,
        notReady: scopedReleases.filter((r) => r.quality.readiness === 'NOT_READY').length,
      };
    }

    return {
      filtersApplied: { productId: filter.productId ?? null, dateFrom: filter.dateFrom ?? null, dateTo: filter.dateTo ?? null },
      productCount,
      requirementCoverage: {
        totalRequirements,
        coveredRequirements,
        requirementCoveragePercent: percent(coveredRequirements, totalRequirements),
      },
      testExecution: {
        totalTestCases,
        executedTestCases,
        testCoveragePercent: percent(executedTestCases, totalTestCases),
        passRatePercent: percent(resultCounts.pass, executedTestCases),
        resultCounts,
      },
      defects: { total: defects.length, openCount: openDefects.length, criticalOpenCount },
      automation: automationSummary,
      apiTesting: apiTestingSummary,
      performance: performanceSummary,
      security: securitySummary,
      uat: uatSummary,
      releaseQuality: releaseSummary,
    };
  }

  async getTestExecutionReport(filter: ReportFilterDto, status: string | undefined, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(status, ['PENDING', 'PASS', 'FAIL', 'BLOCKED'] as const, 'status');
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const executions = await this.prisma.testExecution.findMany({
      where: {
        executedAt: dateRange,
        environmentId: filter.environmentId,
        testCase:
          filter.productId || actorOrganizationId
            ? {
                testScenario: {
                  ...(filter.productId ? { productId: filter.productId } : {}),
                  ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
                },
              }
            : undefined,
      },
      orderBy: { executedAt: 'desc' },
      include: {
        testCase: {
          select: { id: true, title: true, testScenario: { select: { product: { select: { id: true, name: true } } } } },
        },
        environment: { select: { id: true, name: true } },
      },
    });

    const counts = emptyResultCounts();
    for (const execution of executions) bumpResultCounts(counts, execution.status);
    const total = executions.length;
    const decided = total - counts.pending;

    const statusFiltered = executions.filter((e) => !validStatus || e.status === validStatus);

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null },
      summary: { total, resultCounts: counts, passRatePercent: percent(counts.pass, decided) },
      rows: statusFiltered.slice(0, ROW_LIMIT).map((e) => ({
        id: e.id,
        testCaseId: e.testCaseId,
        testCaseTitle: e.testCase.title,
        product: e.testCase.testScenario.product,
        environment: e.environment,
        status: e.status,
        executedBy: e.executedBy,
        executedAt: e.executedAt,
        actualResult: e.actualResult,
        notes: e.notes,
      })),
      rowsTotal: statusFiltered.length,
      rowsTruncated: statusFiltered.length > ROW_LIMIT,
    };
  }

  async getTestCaseStatusReport(
    filter: ReportFilterDto,
    lifecycleStatus: string | undefined,
    resultStatus: string | undefined,
    actorOrganizationId: string | null,
  ) {
    await this.validateFilter(filter, actorOrganizationId);
    const validLifecycle = validateEnumParam(
      lifecycleStatus,
      ['DRAFT', 'READY', 'APPROVED', 'DEPRECATED'] as const,
      'lifecycleStatus',
    );
    const validResult = validateEnumParam(
      resultStatus,
      ['PASS', 'FAIL', 'BLOCKED', 'PENDING', 'NOT_RUN'] as const,
      'resultStatus',
    );
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const testCases = await this.prisma.testCase.findMany({
      where: {
        testScenario:
          filter.productId || actorOrganizationId
            ? {
                ...(filter.productId ? { productId: filter.productId } : {}),
                ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
              }
            : undefined,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        testScenario: { select: { id: true, title: true, product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const testCaseIds = testCases.map((tc) => tc.id);
    const executions = testCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: testCaseIds }, environmentId: filter.environmentId, executedAt: dateRange },
          orderBy: { executedAt: 'desc' },
          select: { testCaseId: true, status: true },
        })
      : [];
    const latestByTestCase = new Map<string, string>();
    for (const execution of executions) {
      if (!latestByTestCase.has(execution.testCaseId)) latestByTestCase.set(execution.testCaseId, execution.status);
    }

    const lifecycleCounts = { draft: 0, ready: 0, approved: 0, deprecated: 0 };
    const resultCounts = emptyResultCounts();
    const rows: Array<{
      id: string;
      title: string;
      priority: string;
      lifecycleStatus: string;
      latestResultStatus: string;
      product: { id: string; name: string };
      testScenario: { id: string; title: string };
    }> = [];

    for (const testCase of testCases) {
      switch (testCase.status) {
        case 'DRAFT':
          lifecycleCounts.draft += 1;
          break;
        case 'READY':
          lifecycleCounts.ready += 1;
          break;
        case 'APPROVED':
          lifecycleCounts.approved += 1;
          break;
        case 'DEPRECATED':
          lifecycleCounts.deprecated += 1;
          break;
      }
      const latestResultRaw = latestByTestCase.get(testCase.id);
      bumpResultCounts(resultCounts, latestResultRaw);
      const latestResult = latestResultRaw ?? 'NOT_RUN';

      if (validLifecycle && testCase.status !== validLifecycle) continue;
      if (validResult && latestResult !== validResult) continue;
      rows.push({
        id: testCase.id,
        title: testCase.title,
        priority: testCase.priority,
        lifecycleStatus: testCase.status,
        latestResultStatus: latestResult,
        product: testCase.testScenario.product,
        testScenario: { id: testCase.testScenario.id, title: testCase.testScenario.title },
      });
    }

    const total = testCases.length;
    const executed = total - resultCounts.notRun;

    return {
      filtersApplied: {
        ...commonFilters(filter),
        lifecycleStatus: validLifecycle ?? null,
        resultStatus: validResult ?? null,
      },
      summary: {
        total,
        lifecycleCounts,
        resultCounts,
        testCoveragePercent: percent(executed, total),
        passRatePercent: percent(resultCounts.pass, executed),
      },
      rows,
    };
  }

  async getRequirementCoverageReport(filter: ReportFilterDto, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId, { allowEnvironment: false, allowDateRange: false });

    const requirements = await this.prisma.requirement.findMany({
      where: {
        ...(filter.productId ? { productId: filter.productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        product: { select: { id: true, name: true } },
        testScenarios: { select: { id: true, testCases: { select: { id: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allTestCaseIds = requirements.flatMap((r) => r.testScenarios.flatMap((s) => s.testCases.map((c) => c.id)));
    const executions = allTestCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: allTestCaseIds } },
          orderBy: { executedAt: 'desc' },
          select: { testCaseId: true, status: true },
        })
      : [];
    const latestByTestCase = new Map<string, string>();
    for (const execution of executions) {
      if (!latestByTestCase.has(execution.testCaseId)) latestByTestCase.set(execution.testCaseId, execution.status);
    }

    const rows = requirements.map((requirement) => {
      const testCaseIds = requirement.testScenarios.flatMap((s) => s.testCases.map((c) => c.id));
      const counts = emptyResultCounts();
      for (const id of testCaseIds) bumpResultCounts(counts, latestByTestCase.get(id));
      const testCaseCount = testCaseIds.length;
      const executedCount = testCaseCount - counts.notRun;
      return {
        id: requirement.id,
        title: requirement.title,
        priority: requirement.priority,
        status: requirement.status,
        product: requirement.product,
        testScenarioCount: requirement.testScenarios.length,
        testCaseCount,
        executedCount,
        coveragePercent: percent(executedCount, testCaseCount),
        resultCounts: counts,
        coverageStatus: computeCoverageStatus(counts, testCaseCount),
      };
    });

    const totalRequirements = requirements.length;
    const coveredRequirements = rows.filter((r) => r.testScenarioCount > 0).length;

    return {
      filtersApplied: { productId: filter.productId ?? null },
      summary: {
        totalRequirements,
        coveredRequirements,
        requirementCoveragePercent: percent(coveredRequirements, totalRequirements),
        fullyPassed: rows.filter((r) => r.coverageStatus === 'PASSED').length,
        notCovered: rows.filter((r) => r.coverageStatus === 'NOT_COVERED').length,
      },
      rows,
    };
  }

  async getTraceabilityReport(filter: ReportFilterDto, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId, { allowEnvironment: false, allowDateRange: false });
    const productScope = {
      ...(filter.productId ? { productId: filter.productId } : {}),
      ...productOrganizationScopeWhere(actorOrganizationId),
    };

    const [requirements, testScenarios, testCases, defects] = await Promise.all([
      this.prisma.requirement.findMany({ where: productScope, select: { id: true, testScenarios: { select: { id: true } } } }),
      this.prisma.testScenario.findMany({ where: productScope, select: { id: true, requirementId: true } }),
      this.prisma.testCase.findMany({
        where: {
          ...(filter.productId || actorOrganizationId
            ? {
                testScenario: {
                  ...(filter.productId ? { productId: filter.productId } : {}),
                  ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
                },
              }
            : {}),
        },
        select: { id: true, title: true, testScenario: { select: { product: { select: { id: true, name: true } } } } },
      }),
      this.prisma.defect.findMany({ where: productScope, select: { id: true, testCaseId: true, testExecutionId: true } }),
    ]);

    const testCaseById = new Map(testCases.map((tc) => [tc.id, tc]));
    const testCaseIds = testCases.map((tc) => tc.id);
    const executions = testCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: testCaseIds } },
          orderBy: { executedAt: 'desc' },
          select: { id: true, testCaseId: true, status: true },
        })
      : [];
    const executionsByTestCase = new Map<string, typeof executions>();
    for (const execution of executions) {
      const bucket = executionsByTestCase.get(execution.testCaseId);
      if (bucket) bucket.push(execution);
      else executionsByTestCase.set(execution.testCaseId, [execution]);
    }

    const resultCounts = emptyResultCounts();
    for (const tc of testCases) bumpResultCounts(resultCounts, executionsByTestCase.get(tc.id)?.[0]?.status);

    const totalTestCases = testCases.length;
    const testCasesExecuted = totalTestCases - resultCounts.notRun;
    const requirementsCovered = requirements.filter((r) => r.testScenarios.length > 0).length;
    const unlinkedTestScenarioCount = testScenarios.filter((s) => !s.requirementId).length;

    const isLatest = (execution: { testCaseId: string; id: string }) =>
      executionsByTestCase.get(execution.testCaseId)?.[0]?.id === execution.id;
    const defectExecutionIds = new Set(
      defects.map((d) => d.testExecutionId).filter((id): id is string => Boolean(id)),
    );
    const latestFailed = executions.filter((e) => e.status === 'FAIL' && isLatest(e));
    const failedWithoutDefects = latestFailed.filter((e) => !defectExecutionIds.has(e.id));
    const orphanTestCases = testCases.filter((tc) => !(executionsByTestCase.get(tc.id)?.length));
    const defectsWithoutLinkageCount = defects.filter((d) => !d.testCaseId && !d.testExecutionId).length;

    return {
      filtersApplied: { productId: filter.productId ?? null },
      summary: {
        totalRequirements: requirements.length,
        requirementsCovered,
        requirementCoveragePercent: percent(requirementsCovered, requirements.length),
        totalTestScenarios: testScenarios.length,
        unlinkedTestScenarioCount,
        totalTestCases,
        testCasesExecuted,
        testCaseCoveragePercent: percent(testCasesExecuted, totalTestCases),
        passRatePercent: percent(resultCounts.pass, testCasesExecuted),
        resultCounts,
        totalDefects: defects.length,
        orphanTestCaseCount: orphanTestCases.length,
        failedWithoutDefectCount: failedWithoutDefects.length,
        defectsWithoutLinkageCount,
      },
      gaps: {
        orphanTestCases: orphanTestCases.slice(0, 50).map((tc) => ({ id: tc.id, title: tc.title, product: tc.testScenario.product })),
        failedWithoutDefects: failedWithoutDefects.slice(0, 50).map((e) => {
          const tc = testCaseById.get(e.testCaseId);
          return { id: e.id, testCaseId: e.testCaseId, testCaseTitle: tc?.title ?? 'Unknown', product: tc?.testScenario.product ?? null };
        }),
      },
      fullMatrixPath: '/traceability',
    };
  }

  async getDefectReport(
    filter: ReportFilterDto,
    status: string | undefined,
    severity: string | undefined,
    actorOrganizationId: string | null,
  ) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(
      status,
      ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED'] as const,
      'status',
    );
    const validSeverity = validateEnumParam(severity, ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as const, 'severity');
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const defects = await this.prisma.defect.findMany({
      where: {
        productId: filter.productId,
        environmentId: filter.environmentId,
        createdAt: dateRange,
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
        testCase: { select: { id: true, title: true } },
      },
    });

    const statusCounts = { open: 0, inProgress: 0, resolved: 0, reopened: 0, closed: 0 };
    const severityCounts = { critical: 0, major: 0, minor: 0, trivial: 0 };
    const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const d of defects) {
      switch (d.status) {
        case 'OPEN':
          statusCounts.open += 1;
          break;
        case 'IN_PROGRESS':
          statusCounts.inProgress += 1;
          break;
        case 'RESOLVED':
          statusCounts.resolved += 1;
          break;
        case 'REOPENED':
          statusCounts.reopened += 1;
          break;
        case 'CLOSED':
          statusCounts.closed += 1;
          break;
      }
      switch (d.severity) {
        case 'CRITICAL':
          severityCounts.critical += 1;
          break;
        case 'MAJOR':
          severityCounts.major += 1;
          break;
        case 'MINOR':
          severityCounts.minor += 1;
          break;
        case 'TRIVIAL':
          severityCounts.trivial += 1;
          break;
      }
      switch (d.priority) {
        case 'CRITICAL':
          priorityCounts.critical += 1;
          break;
        case 'HIGH':
          priorityCounts.high += 1;
          break;
        case 'MEDIUM':
          priorityCounts.medium += 1;
          break;
        case 'LOW':
          priorityCounts.low += 1;
          break;
      }
    }
    const openStatuses = new Set(['OPEN', 'IN_PROGRESS', 'REOPENED']);
    const openCount = defects.filter((d) => openStatuses.has(d.status)).length;
    const criticalOpenCount = defects.filter((d) => openStatuses.has(d.status) && d.severity === 'CRITICAL').length;

    const rows = defects.filter(
      (d) => (!validStatus || d.status === validStatus) && (!validSeverity || d.severity === validSeverity),
    );

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null, severity: validSeverity ?? null },
      summary: { total: defects.length, openCount, criticalOpenCount, statusCounts, severityCounts, priorityCounts },
      rows: rows.map((d) => ({
        id: d.id,
        title: d.title,
        severity: d.severity,
        priority: d.priority,
        status: d.status,
        product: d.product,
        environment: d.environment,
        testCase: d.testCase,
        assignedTo: d.assignedTo,
        createdAt: d.createdAt,
      })),
    };
  }

  async getAutomationReport(filter: ReportFilterDto, status: string | undefined, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(status, ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN'] as const, 'status');
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const automations = await this.prisma.automation.findMany({
      where: {
        environmentId: filter.environmentId,
        testCase:
          filter.productId || actorOrganizationId
            ? {
                testScenario: {
                  ...(filter.productId ? { productId: filter.productId } : {}),
                  ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
                },
              }
            : undefined,
      },
      select: {
        id: true,
        name: true,
        type: true,
        framework: true,
        lastRunStatus: true,
        testCase: { select: { testScenario: { select: { product: { select: { id: true, name: true } } } } } },
        environment: { select: { id: true, name: true } },
      },
    });

    const automationIds = automations.map((a) => a.id);
    const runs = automationIds.length
      ? await this.prisma.automationRun.findMany({
          where: { automationId: { in: automationIds }, startedAt: dateRange },
          orderBy: { startedAt: 'desc' },
          select: { id: true, automationId: true, status: true, startedAt: true, finishedAt: true, recordedBy: true, notes: true },
        })
      : [];

    // With no date range, "current" status is each automation's own
    // maintained lastRunStatus. With a date range, it must be recomputed
    // from only the runs inside that window -- otherwise the filter would
    // be cosmetic and the breakdown wouldn't reflect what was asked for.
    const statusByAutomation = new Map<string, string>();
    if (dateRange) {
      for (const run of runs) {
        if (!statusByAutomation.has(run.automationId)) statusByAutomation.set(run.automationId, run.status);
      }
    } else {
      for (const automation of automations) statusByAutomation.set(automation.id, automation.lastRunStatus);
    }

    const counts = { pass: 0, fail: 0, blocked: 0, notRun: 0 };
    for (const automation of automations) {
      switch (statusByAutomation.get(automation.id) ?? 'NOT_RUN') {
        case 'PASS':
          counts.pass += 1;
          break;
        case 'FAIL':
          counts.fail += 1;
          break;
        case 'BLOCKED':
          counts.blocked += 1;
          break;
        default:
          counts.notRun += 1;
      }
    }

    const automationById = new Map(automations.map((a) => [a.id, a]));
    const statusFiltered = runs.filter((run) => !validStatus || run.status === validStatus);

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null },
      summary: {
        totalAutomations: automations.length,
        resultCounts: counts,
        passRatePercent: percent(counts.pass, automations.length - counts.notRun),
        totalRuns: runs.length,
      },
      rows: statusFiltered.slice(0, ROW_LIMIT).map((run) => {
        const automation = automationById.get(run.automationId);
        return {
          id: run.id,
          automationId: run.automationId,
          automationName: automation?.name ?? 'Unknown',
          type: automation?.type,
          framework: automation?.framework,
          product: automation?.testCase.testScenario.product ?? null,
          environment: automation?.environment ?? null,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          recordedBy: run.recordedBy,
          notes: run.notes,
        };
      }),
      rowsTotal: statusFiltered.length,
      rowsTruncated: statusFiltered.length > ROW_LIMIT,
    };
  }

  async getApiTestingReport(filter: ReportFilterDto, status: string | undefined, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(status, ['PASSED', 'FAILED', 'NO_ASSERTION'] as const, 'status');
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const requests = await this.prisma.apiTestRequest.findMany({
      where: {
        productId: filter.productId,
        environmentId: filter.environmentId,
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: {
        id: true,
        name: true,
        method: true,
        url: true,
        product: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
      },
    });
    const requestIds = requests.map((r) => r.id);
    const executions = requestIds.length
      ? await this.prisma.apiTestExecution.findMany({
          where: { apiRequestId: { in: requestIds }, executedAt: dateRange },
          orderBy: { executedAt: 'desc' },
          select: { id: true, apiRequestId: true, statusCode: true, responseTimeMs: true, passed: true, errorMessage: true, executedAt: true },
        })
      : [];

    const counts = { passed: 0, failed: 0, noAssertion: 0 };
    for (const e of executions) {
      if (e.passed === true) counts.passed += 1;
      else if (e.passed === false) counts.failed += 1;
      else counts.noAssertion += 1;
    }
    const avgResponseTimeMs = executions.length
      ? Math.round(executions.reduce((sum, e) => sum + (e.responseTimeMs ?? 0), 0) / executions.length)
      : 0;

    const requestById = new Map(requests.map((r) => [r.id, r]));
    const matchesStatus = (e: (typeof executions)[number]) => {
      if (!validStatus) return true;
      if (validStatus === 'PASSED') return e.passed === true;
      if (validStatus === 'FAILED') return e.passed === false;
      return e.passed === null;
    };
    const statusFiltered = executions.filter(matchesStatus);

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null },
      summary: {
        totalRequests: requests.length,
        totalExecutions: executions.length,
        passedCount: counts.passed,
        failedCount: counts.failed,
        noAssertionCount: counts.noAssertion,
        passRatePercent: percent(counts.passed, counts.passed + counts.failed),
        avgResponseTimeMs,
      },
      rows: statusFiltered.slice(0, ROW_LIMIT).map((e) => {
        const request = requestById.get(e.apiRequestId);
        return {
          id: e.id,
          requestId: e.apiRequestId,
          requestName: request?.name ?? 'Unknown',
          method: request?.method,
          url: request?.url,
          product: request?.product ?? null,
          environment: request?.environment ?? null,
          statusCode: e.statusCode,
          responseTimeMs: e.responseTimeMs,
          passed: e.passed,
          errorMessage: e.errorMessage,
          executedAt: e.executedAt,
        };
      }),
      rowsTotal: statusFiltered.length,
      rowsTruncated: statusFiltered.length > ROW_LIMIT,
    };
  }

  async getPerformanceReport(filter: ReportFilterDto, status: string | undefined, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(
      status,
      ['QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'STOPPED'] as const,
      'status',
    );
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const tests = await this.prisma.performanceTest.findMany({
      where: {
        productId: filter.productId,
        environmentId: filter.environmentId,
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: {
        id: true,
        name: true,
        lastRunStatus: true,
        product: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
      },
    });
    const testIds = tests.map((t) => t.id);
    const runs = testIds.length
      ? await this.prisma.performanceTestRun.findMany({
          where: { performanceTestId: { in: testIds }, startedAt: dateRange },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            performanceTestId: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            avgResponseTimeMs: true,
            p95ResponseTimeMs: true,
            throughputRps: true,
            errorRatePercent: true,
            thresholdsPassed: true,
            errorMessage: true,
          },
        })
      : [];

    const statusByTest = new Map<string, string | null>();
    if (dateRange) {
      for (const run of runs) {
        if (!statusByTest.has(run.performanceTestId)) statusByTest.set(run.performanceTestId, run.status);
      }
    } else {
      for (const test of tests) statusByTest.set(test.id, test.lastRunStatus);
    }

    const counts = { queued: 0, running: 0, passed: 0, failed: 0, stopped: 0, neverRun: 0 };
    for (const test of tests) {
      switch (statusByTest.get(test.id)) {
        case 'QUEUED':
          counts.queued += 1;
          break;
        case 'RUNNING':
          counts.running += 1;
          break;
        case 'PASSED':
          counts.passed += 1;
          break;
        case 'FAILED':
          counts.failed += 1;
          break;
        case 'STOPPED':
          counts.stopped += 1;
          break;
        default:
          counts.neverRun += 1;
      }
    }

    const testById = new Map(tests.map((t) => [t.id, t]));
    const statusFiltered = runs.filter((run) => !validStatus || run.status === validStatus);

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null },
      summary: {
        totalTests: tests.length,
        resultCounts: counts,
        passRatePercent: percent(counts.passed, counts.passed + counts.failed),
        totalRuns: runs.length,
      },
      rows: statusFiltered.slice(0, ROW_LIMIT).map((run) => {
        const test = testById.get(run.performanceTestId);
        return {
          id: run.id,
          testId: run.performanceTestId,
          testName: test?.name ?? 'Unknown',
          product: test?.product ?? null,
          environment: test?.environment ?? null,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          avgResponseTimeMs: run.avgResponseTimeMs,
          p95ResponseTimeMs: run.p95ResponseTimeMs,
          throughputRps: run.throughputRps,
          errorRatePercent: run.errorRatePercent,
          thresholdsPassed: run.thresholdsPassed,
          errorMessage: run.errorMessage,
        };
      }),
      rowsTotal: statusFiltered.length,
      rowsTruncated: statusFiltered.length > ROW_LIMIT,
    };
  }

  async getSecurityReport(
    filter: ReportFilterDto,
    status: string | undefined,
    severity: string | undefined,
    actorOrganizationId: string | null,
  ) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(
      status,
      ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'ACCEPTED'] as const,
      'status',
    );
    const validSeverity = validateEnumParam(
      severity,
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const,
      'severity',
    );
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const tests = await this.prisma.securityTest.findMany({
      where: {
        productId: filter.productId,
        environmentId: filter.environmentId,
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: {
        id: true,
        name: true,
        testType: true,
        product: { select: { id: true, name: true } },
        environment: { select: { id: true, name: true } },
      },
    });
    const testIds = tests.map((t) => t.id);
    const findings = testIds.length
      ? await this.prisma.securityFinding.findMany({
          where: { securityTestId: { in: testIds }, discoveredAt: dateRange },
          orderBy: { discoveredAt: 'desc' },
          select: { id: true, securityTestId: true, title: true, severity: true, status: true, discoveredAt: true, recommendation: true, evidence: true },
        })
      : [];

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const statusCounts = { open: 0, inProgress: 0, resolved: 0, reopened: 0, accepted: 0 };
    for (const f of findings) {
      switch (f.severity) {
        case 'CRITICAL':
          severityCounts.critical += 1;
          break;
        case 'HIGH':
          severityCounts.high += 1;
          break;
        case 'MEDIUM':
          severityCounts.medium += 1;
          break;
        case 'LOW':
          severityCounts.low += 1;
          break;
        case 'INFO':
          severityCounts.info += 1;
          break;
      }
      switch (f.status) {
        case 'OPEN':
          statusCounts.open += 1;
          break;
        case 'IN_PROGRESS':
          statusCounts.inProgress += 1;
          break;
        case 'RESOLVED':
          statusCounts.resolved += 1;
          break;
        case 'REOPENED':
          statusCounts.reopened += 1;
          break;
        case 'ACCEPTED':
          statusCounts.accepted += 1;
          break;
      }
    }
    const openStatuses = new Set(['OPEN', 'IN_PROGRESS', 'REOPENED']);
    const openCriticalHighCount = findings.filter(
      (f) => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && openStatuses.has(f.status),
    ).length;

    const testById = new Map(tests.map((t) => [t.id, t]));
    const rows = findings.filter(
      (f) => (!validStatus || f.status === validStatus) && (!validSeverity || f.severity === validSeverity),
    );

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null, severity: validSeverity ?? null },
      summary: { totalTests: tests.length, totalFindings: findings.length, severityCounts, statusCounts, openCriticalHighCount },
      rows: rows.slice(0, ROW_LIMIT).map((f) => {
        const test = testById.get(f.securityTestId);
        return {
          id: f.id,
          title: f.title,
          severity: f.severity,
          status: f.status,
          discoveredAt: f.discoveredAt,
          recommendation: f.recommendation,
          evidence: f.evidence,
          testName: test?.name ?? 'Unknown',
          testType: test?.testType,
          product: test?.product ?? null,
          environment: test?.environment ?? null,
        };
      }),
      rowsTotal: rows.length,
      rowsTruncated: rows.length > ROW_LIMIT,
    };
  }

  async getUatReport(filter: ReportFilterDto, status: string | undefined, actorOrganizationId: string | null) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(
      status,
      ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'] as const,
      'status',
    );
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const cycles = await this.prisma.uatCycle.findMany({
      where: {
        productId: filter.productId,
        createdAt: dateRange,
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: {
        id: true,
        name: true,
        status: true,
        signOffBy: true,
        signOffAt: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
        testCases: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = { planned: 0, inProgress: 0, completed: 0, approved: 0, rejected: 0 };
    for (const c of cycles) {
      switch (c.status) {
        case 'PLANNED':
          statusCounts.planned += 1;
          break;
        case 'IN_PROGRESS':
          statusCounts.inProgress += 1;
          break;
        case 'COMPLETED':
          statusCounts.completed += 1;
          break;
        case 'APPROVED':
          statusCounts.approved += 1;
          break;
        case 'REJECTED':
          statusCounts.rejected += 1;
          break;
      }
    }

    const uatTestCaseIds = cycles.flatMap((c) => c.testCases.map((tc) => tc.id));
    const executions = uatTestCaseIds.length
      ? await this.prisma.uatExecution.findMany({
          where: { uatTestCaseId: { in: uatTestCaseIds }, environmentId: filter.environmentId },
          orderBy: { executedAt: 'desc' },
          select: { uatTestCaseId: true, status: true },
        })
      : [];
    const latestByUatTestCase = new Map<string, string>();
    for (const e of executions) {
      if (!latestByUatTestCase.has(e.uatTestCaseId)) latestByUatTestCase.set(e.uatTestCaseId, e.status);
    }

    const resultCounts = { pass: 0, fail: 0, blocked: 0, notRun: 0, notApplicable: 0 };
    for (const id of uatTestCaseIds) {
      switch (latestByUatTestCase.get(id)) {
        case 'PASS':
          resultCounts.pass += 1;
          break;
        case 'FAIL':
          resultCounts.fail += 1;
          break;
        case 'BLOCKED':
          resultCounts.blocked += 1;
          break;
        case 'NOT_APPLICABLE':
          resultCounts.notApplicable += 1;
          break;
        default:
          resultCounts.notRun += 1;
      }
    }

    const rows = cycles.filter((c) => !validStatus || c.status === validStatus);
    const decided = uatTestCaseIds.length - resultCounts.notRun - resultCounts.notApplicable;

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null },
      summary: {
        totalCycles: cycles.length,
        statusCounts,
        totalUatTestCases: uatTestCaseIds.length,
        resultCounts,
        passRatePercent: percent(resultCounts.pass, decided),
      },
      rows: rows.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        product: c.product,
        signOffBy: c.signOffBy,
        signOffAt: c.signOffAt,
        createdAt: c.createdAt,
        testCaseCount: c.testCases.length,
      })),
    };
  }

  async getReleaseQualityReport(
    filter: ReportFilterDto,
    status: string | undefined,
    readiness: string | undefined,
    actorOrganizationId: string | null,
  ) {
    await this.validateFilter(filter, actorOrganizationId);
    const validStatus = validateEnumParam(
      status,
      ['PLANNED', 'IN_TESTING', 'COMPLETED', 'APPROVED', 'REJECTED'] as const,
      'status',
    );
    const validReadiness = validateEnumParam(readiness, ['READY', 'CONDITIONAL', 'NOT_READY'] as const, 'readiness');
    const dateRange = buildDateRange(filter.dateFrom, filter.dateTo);

    const allReleases = await this.releaseQualityService.findAll(filter.productId, actorOrganizationId);
    const population = allReleases.filter((r) => {
      if (filter.productId && r.productId !== filter.productId) return false;
      if (filter.environmentId && r.environmentId !== filter.environmentId) return false;
      if (dateRange) {
        const referenceDate = r.releaseDate ? new Date(r.releaseDate) : new Date(r.createdAt);
        if (dateRange.gte && referenceDate < dateRange.gte) return false;
        if (dateRange.lte && referenceDate > dateRange.lte) return false;
      }
      return true;
    });

    const readinessCounts = { ready: 0, conditional: 0, notReady: 0 };
    const statusCounts = { planned: 0, inTesting: 0, completed: 0, approved: 0, rejected: 0 };
    for (const r of population) {
      switch (r.quality.readiness) {
        case 'READY':
          readinessCounts.ready += 1;
          break;
        case 'CONDITIONAL':
          readinessCounts.conditional += 1;
          break;
        case 'NOT_READY':
          readinessCounts.notReady += 1;
          break;
      }
      switch (r.status) {
        case 'PLANNED':
          statusCounts.planned += 1;
          break;
        case 'IN_TESTING':
          statusCounts.inTesting += 1;
          break;
        case 'COMPLETED':
          statusCounts.completed += 1;
          break;
        case 'APPROVED':
          statusCounts.approved += 1;
          break;
        case 'REJECTED':
          statusCounts.rejected += 1;
          break;
      }
    }

    const rows = population
      .filter((r) => !validStatus || r.status === validStatus)
      .filter((r) => !validReadiness || r.quality.readiness === validReadiness)
      .map((r) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        status: r.status,
        releaseDate: r.releaseDate,
        product: r.product,
        environment: r.environment,
        readiness: r.quality.readiness,
        passRatePercent: r.quality.testExecutionSummary.passRatePercent,
        openDefects: r.quality.defects.openCount,
        failingGates: r.quality.gates
          .filter((g) => !g.passed)
          .map((g) => ({ key: g.key, label: g.label, impact: g.impact })),
      }));

    return {
      filtersApplied: { ...commonFilters(filter), status: validStatus ?? null, readiness: validReadiness ?? null },
      summary: { totalReleases: population.length, readinessCounts, statusCounts },
      rows,
    };
  }

  private async assertProductExists(productId: string, actorOrganizationId: string | null): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    // A cross-organization productId is treated as not found, not a bad
    // request -- same reasoning as assertSameOrganization elsewhere: it
    // shouldn't confirm that the product exists in another organization.
    if (actorOrganizationId && product.organizationId !== actorOrganizationId) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
  }

  private async assertEnvironmentValid(environmentId: string, productId?: string): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true, productId: true },
    });
    if (!environment) {
      throw new BadRequestException(`Environment ${environmentId} not found`);
    }
    if (productId && environment.productId !== productId) {
      throw new BadRequestException(`Environment ${environmentId} does not belong to the selected product.`);
    }
  }

  private async validateFilter(
    filter: ReportFilterDto,
    actorOrganizationId: string | null,
    options?: { allowEnvironment?: boolean; allowDateRange?: boolean },
  ): Promise<void> {
    if (options?.allowDateRange === false && (filter.dateFrom || filter.dateTo)) {
      throw new BadRequestException('This report does not support date-range filtering.');
    }
    if (options?.allowEnvironment === false && filter.environmentId) {
      throw new BadRequestException('This report does not support environment filtering.');
    }
    if (filter.dateFrom && filter.dateTo && new Date(filter.dateFrom).getTime() > new Date(filter.dateTo).getTime()) {
      throw new BadRequestException('dateFrom must not be after dateTo.');
    }
    if (filter.productId) await this.assertProductExists(filter.productId, actorOrganizationId);
    if (filter.environmentId) await this.assertEnvironmentValid(filter.environmentId, filter.productId);
  }
}
