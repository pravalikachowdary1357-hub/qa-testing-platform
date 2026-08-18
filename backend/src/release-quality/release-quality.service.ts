import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { ReleaseStatus } from '../../generated/prisma/enums.js';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { SignOffReleaseDto } from './dto/sign-off-release.dto';

const PRODUCT_REF = { select: { id: true, name: true } };
const ENVIRONMENT_REF = { select: { id: true, name: true } };

const RELEASE_INCLUDE = {
  product: PRODUCT_REF,
  environment: ENVIRONMENT_REF,
};

// Every numeric bar a release is judged against, named and centralized so the
// rules stay explicit and can be tuned in one place without hunting through
// the gate definitions below.
const QUALITY_THRESHOLDS = {
  MIN_PASS_RATE_BLOCKING: 50,
  MIN_PASS_RATE_READY: 90,
  MIN_TEST_COVERAGE_READY: 80,
  MIN_REQUIREMENT_COVERAGE_READY: 70,
  MAX_OPEN_SEVERE_DEFECTS_READY: 3,
};

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

type ResultCounts = { pass: number; fail: number; blocked: number; pending: number; notRun: number };

export interface QualityGateResult {
  key: string;
  label: string;
  impact: 'BLOCKING' | 'WARNING';
  passed: boolean;
  detail: string;
}

interface GateInput {
  executedTestCases: number;
  passRatePercent: number;
  testCoveragePercent: number;
  requirementCoveragePercent: number;
  openCriticalDefectCount: number;
  openCriticalMajorDefectCount: number;
  openCriticalHighFindingCount: number;
  failedWithoutDefectCount: number;
  rejectedUatCycleCount: number;
  totalUatCycles: number;
  approvedUatCycleCount: number;
  failedPerformanceTestCount: number;
  failedAutomationCount: number;
  failedApiTestCount: number;
}

// The rules a release is judged against, most-severe first. BLOCKING gates
// force NOT_READY on their own; WARNING gates force CONDITIONAL (unless a
// BLOCKING gate has already failed). Add a gate here to change the policy --
// nothing else in this file needs to change.
function evaluateGates(input: GateInput): QualityGateResult[] {
  return [
    {
      key: 'no_open_critical_defects',
      label: 'No open critical-severity defects',
      impact: 'BLOCKING',
      passed: input.openCriticalDefectCount === 0,
      detail:
        input.openCriticalDefectCount === 0
          ? 'No open critical-severity defects.'
          : `${input.openCriticalDefectCount} open critical-severity defect(s) must be resolved first.`,
    },
    {
      key: 'no_open_critical_high_security_findings',
      label: 'No open critical/high security findings',
      impact: 'BLOCKING',
      passed: input.openCriticalHighFindingCount === 0,
      detail:
        input.openCriticalHighFindingCount === 0
          ? 'No open critical or high-severity security findings.'
          : `${input.openCriticalHighFindingCount} open critical/high-severity security finding(s) must be resolved or accepted first.`,
    },
    {
      key: 'no_rejected_uat',
      label: 'No rejected UAT cycles',
      impact: 'BLOCKING',
      passed: input.rejectedUatCycleCount === 0,
      detail:
        input.rejectedUatCycleCount === 0
          ? 'No UAT cycles have been rejected.'
          : `${input.rejectedUatCycleCount} UAT cycle(s) were rejected by stakeholders.`,
    },
    {
      key: 'minimum_pass_rate',
      label: `Test pass rate at least ${QUALITY_THRESHOLDS.MIN_PASS_RATE_BLOCKING}%`,
      impact: 'BLOCKING',
      passed: input.executedTestCases > 0 && input.passRatePercent >= QUALITY_THRESHOLDS.MIN_PASS_RATE_BLOCKING,
      detail:
        input.executedTestCases === 0
          ? 'No test cases have been executed yet.'
          : `Pass rate is ${input.passRatePercent}% (minimum ${QUALITY_THRESHOLDS.MIN_PASS_RATE_BLOCKING}%).`,
    },
    {
      key: 'target_pass_rate',
      label: `Test pass rate at least ${QUALITY_THRESHOLDS.MIN_PASS_RATE_READY}%`,
      impact: 'WARNING',
      passed: input.passRatePercent >= QUALITY_THRESHOLDS.MIN_PASS_RATE_READY,
      detail: `Pass rate is ${input.passRatePercent}% (target ${QUALITY_THRESHOLDS.MIN_PASS_RATE_READY}%).`,
    },
    {
      key: 'target_test_coverage',
      label: `Test case coverage at least ${QUALITY_THRESHOLDS.MIN_TEST_COVERAGE_READY}%`,
      impact: 'WARNING',
      passed: input.testCoveragePercent >= QUALITY_THRESHOLDS.MIN_TEST_COVERAGE_READY,
      detail: `${input.testCoveragePercent}% of test cases have been executed at least once (target ${QUALITY_THRESHOLDS.MIN_TEST_COVERAGE_READY}%).`,
    },
    {
      key: 'target_requirement_coverage',
      label: `Requirement coverage at least ${QUALITY_THRESHOLDS.MIN_REQUIREMENT_COVERAGE_READY}%`,
      impact: 'WARNING',
      passed: input.requirementCoveragePercent >= QUALITY_THRESHOLDS.MIN_REQUIREMENT_COVERAGE_READY,
      detail: `${input.requirementCoveragePercent}% of requirements have at least one test scenario (target ${QUALITY_THRESHOLDS.MIN_REQUIREMENT_COVERAGE_READY}%).`,
    },
    {
      key: 'severe_defect_threshold',
      label: `At most ${QUALITY_THRESHOLDS.MAX_OPEN_SEVERE_DEFECTS_READY} open critical/major defects`,
      impact: 'WARNING',
      passed: input.openCriticalMajorDefectCount <= QUALITY_THRESHOLDS.MAX_OPEN_SEVERE_DEFECTS_READY,
      detail: `${input.openCriticalMajorDefectCount} open critical/major defect(s) (limit ${QUALITY_THRESHOLDS.MAX_OPEN_SEVERE_DEFECTS_READY}).`,
    },
    {
      key: 'no_failed_tests_without_defects',
      label: 'Every currently-failing test has a linked defect',
      impact: 'WARNING',
      passed: input.failedWithoutDefectCount === 0,
      detail:
        input.failedWithoutDefectCount === 0
          ? 'Every currently-failing test case has a linked defect.'
          : `${input.failedWithoutDefectCount} currently-failing test case(s) have no defect on file.`,
    },
    {
      key: 'uat_signed_off',
      label: 'UAT signed off (where applicable)',
      impact: 'WARNING',
      passed: input.totalUatCycles === 0 || input.approvedUatCycleCount > 0,
      detail:
        input.totalUatCycles === 0
          ? 'No UAT cycles exist for this product; UAT sign-off is not applicable.'
          : input.approvedUatCycleCount > 0
            ? `${input.approvedUatCycleCount} UAT cycle(s) approved.`
            : 'UAT cycles exist but none have been approved yet.',
    },
    {
      key: 'no_failed_performance_tests',
      label: 'No failing performance test results',
      impact: 'WARNING',
      passed: input.failedPerformanceTestCount === 0,
      detail:
        input.failedPerformanceTestCount === 0
          ? 'No failing performance test results.'
          : `${input.failedPerformanceTestCount} performance test(s) last failed.`,
    },
    {
      key: 'no_failed_automation_runs',
      label: 'No failing automation results',
      impact: 'WARNING',
      passed: input.failedAutomationCount === 0,
      detail:
        input.failedAutomationCount === 0
          ? 'No failing automation results.'
          : `${input.failedAutomationCount} automation(s) last failed.`,
    },
    {
      key: 'no_failed_api_tests',
      label: 'No failing API test results',
      impact: 'WARNING',
      passed: input.failedApiTestCount === 0,
      detail:
        input.failedApiTestCount === 0
          ? 'No failing API test results.'
          : `${input.failedApiTestCount} API test execution(s) last failed.`,
    },
  ];
}

function computeReadiness(gates: QualityGateResult[]): 'READY' | 'CONDITIONAL' | 'NOT_READY' {
  if (gates.some((gate) => gate.impact === 'BLOCKING' && !gate.passed)) return 'NOT_READY';
  if (gates.some((gate) => gate.impact === 'WARNING' && !gate.passed)) return 'CONDITIONAL';
  return 'READY';
}

@Injectable()
export class ReleaseQualityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(productId?: string) {
    const releases = await this.prisma.release.findMany({
      where: productId ? { productId } : {},
      include: RELEASE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(releases.map((release) => this.attachQuality(release)));
  }

  async findOne(id: string) {
    const release = await this.prisma.release.findUnique({ where: { id }, include: RELEASE_INCLUDE });
    if (!release) {
      throw new NotFoundException(`Release ${id} not found`);
    }
    return this.attachQuality(release);
  }

  async create(dto: CreateReleaseDto) {
    if (dto.environmentId) {
      await this.validateEnvironmentBelongsToProduct(dto.environmentId, dto.productId);
    }

    try {
      const release = await this.prisma.release.create({
        data: {
          productId: dto.productId,
          environmentId: dto.environmentId,
          name: dto.name,
          version: dto.version,
          releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
          notes: dto.notes,
        },
        include: RELEASE_INCLUDE,
      });
      return this.attachQuality(release);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateReleaseDto) {
    const existing = await this.prisma.release.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Release ${id} not found`);
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;
    if (effectiveEnvironmentId) {
      await this.validateEnvironmentBelongsToProduct(effectiveEnvironmentId, effectiveProductId);
    }

    try {
      const release = await this.prisma.release.update({
        where: { id },
        data: {
          productId: dto.productId,
          environmentId: dto.environmentId,
          name: dto.name,
          version: dto.version,
          status: dto.status,
          releaseDate:
            dto.releaseDate !== undefined ? (dto.releaseDate ? new Date(dto.releaseDate) : null) : undefined,
          notes: dto.notes,
        },
        include: RELEASE_INCLUDE,
      });
      return this.attachQuality(release);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Release ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.release.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Release ${id} not found`);
      }
      throw error;
    }
  }

  async signOff(id: string, dto: SignOffReleaseDto) {
    const existing = await this.prisma.release.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Release ${id} not found`);
    }

    const signable: ReleaseStatus[] = [ReleaseStatus.COMPLETED, ReleaseStatus.APPROVED, ReleaseStatus.REJECTED];
    if (!signable.includes(existing.status)) {
      throw new BadRequestException('This release must be COMPLETED before it can be signed off.');
    }

    const release = await this.prisma.release.update({
      where: { id },
      data: {
        status: dto.decision,
        signOffBy: dto.signOffBy,
        signOffAt: new Date(),
        signOffNotes: dto.signOffNotes,
      },
      include: RELEASE_INCLUDE,
    });
    return this.attachQuality(release);
  }

  private async attachQuality<T extends { productId: string }>(release: T) {
    const quality = await this.computeQuality(release.productId);
    return { ...release, quality };
  }

  private async computeQuality(productId: string) {
    const [
      testCases,
      totalRequirements,
      coveredRequirements,
      defects,
      automations,
      apiRequests,
      performanceTests,
      securityTests,
      uatCycles,
    ] = await Promise.all([
      this.prisma.testCase.findMany({ where: { testScenario: { productId } }, select: { id: true } }),
      this.prisma.requirement.count({ where: { productId } }),
      this.prisma.requirement.count({ where: { productId, testScenarios: { some: {} } } }),
      this.prisma.defect.findMany({ where: { productId }, select: { severity: true, status: true } }),
      this.prisma.automation.findMany({
        where: { testCase: { testScenario: { productId } } },
        select: { lastRunStatus: true },
      }),
      this.prisma.apiTestRequest.findMany({ where: { productId }, select: { id: true } }),
      this.prisma.performanceTest.findMany({ where: { productId }, select: { lastRunStatus: true } }),
      this.prisma.securityTest.findMany({ where: { productId }, select: { id: true } }),
      this.prisma.uatCycle.findMany({
        where: { productId },
        select: { id: true, name: true, status: true, signOffBy: true, signOffAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // ---- Test execution summary (latest execution per test case wins) ----
    const testCaseIds = testCases.map((testCase) => testCase.id);
    const executions = testCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: testCaseIds } },
          orderBy: { executedAt: 'desc' },
          select: { id: true, testCaseId: true, status: true },
        })
      : [];

    const executionsByTestCaseId = new Map<string, typeof executions>();
    for (const execution of executions) {
      const bucket = executionsByTestCaseId.get(execution.testCaseId);
      if (bucket) bucket.push(execution);
      else executionsByTestCaseId.set(execution.testCaseId, [execution]);
    }

    const resultCounts: ResultCounts = { pass: 0, fail: 0, blocked: 0, pending: 0, notRun: 0 };
    for (const testCase of testCases) {
      const latest = executionsByTestCaseId.get(testCase.id)?.[0];
      switch (latest?.status) {
        case 'PASS':
          resultCounts.pass += 1;
          break;
        case 'FAIL':
          resultCounts.fail += 1;
          break;
        case 'BLOCKED':
          resultCounts.blocked += 1;
          break;
        case 'PENDING':
          resultCounts.pending += 1;
          break;
        default:
          resultCounts.notRun += 1;
      }
    }
    const totalTestCases = testCases.length;
    const executedTestCases = totalTestCases - resultCounts.notRun;
    const testCoveragePercent = percent(executedTestCases, totalTestCases);
    const passRatePercent = percent(resultCounts.pass, executedTestCases);

    // A failed test only counts as an outstanding gap if it's still the LATEST
    // result for its test case -- a failure superseded by a passing retest is
    // resolved, matching the same rule used by the Traceability module.
    const latestFailedExecutionIds = executions
      .filter((execution) => execution.status === 'FAIL' && executionsByTestCaseId.get(execution.testCaseId)?.[0]?.id === execution.id)
      .map((execution) => execution.id);
    const defectsLinkedToFailedExecutions = latestFailedExecutionIds.length
      ? await this.prisma.defect.findMany({
          where: { testExecutionId: { in: latestFailedExecutionIds } },
          select: { testExecutionId: true },
        })
      : [];
    const executionIdsWithDefects = new Set(defectsLinkedToFailedExecutions.map((d) => d.testExecutionId));
    const failedWithoutDefectCount = latestFailedExecutionIds.filter((id) => !executionIdsWithDefects.has(id)).length;

    // ---- Requirement coverage ----
    const requirementCoveragePercent = percent(coveredRequirements, totalRequirements);

    // ---- Defects ----
    const openDefects = defects.filter(
      (defect) => defect.status === 'OPEN' || defect.status === 'IN_PROGRESS' || defect.status === 'REOPENED',
    );
    const openCriticalDefectCount = openDefects.filter((defect) => defect.severity === 'CRITICAL').length;
    const openCriticalMajorDefectCount = openDefects.filter(
      (defect) => defect.severity === 'CRITICAL' || defect.severity === 'MAJOR',
    ).length;
    const defectStatusCounts = { open: 0, inProgress: 0, resolved: 0, reopened: 0, closed: 0 };
    for (const defect of defects) {
      switch (defect.status) {
        case 'OPEN':
          defectStatusCounts.open += 1;
          break;
        case 'IN_PROGRESS':
          defectStatusCounts.inProgress += 1;
          break;
        case 'RESOLVED':
          defectStatusCounts.resolved += 1;
          break;
        case 'REOPENED':
          defectStatusCounts.reopened += 1;
          break;
        case 'CLOSED':
          defectStatusCounts.closed += 1;
          break;
      }
    }

    // ---- Automation (where available) ----
    let automationSummary: {
      total: number;
      pass: number;
      fail: number;
      blocked: number;
      notRun: number;
    } | null = null;
    let failedAutomationCount = 0;
    if (automations.length > 0) {
      const counts = { pass: 0, fail: 0, blocked: 0, notRun: 0 };
      for (const automation of automations) {
        switch (automation.lastRunStatus) {
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
      failedAutomationCount = counts.fail;
      automationSummary = { total: automations.length, ...counts };
    }

    // ---- API testing (where available) ----
    let apiTestingSummary: {
      totalRequests: number;
      totalExecutions: number;
      passedCount: number;
      failedCount: number;
      noAssertionCount: number;
    } | null = null;
    let failedApiTestCount = 0;
    if (apiRequests.length > 0) {
      const apiRequestIds = apiRequests.map((request) => request.id);
      const apiExecutions = await this.prisma.apiTestExecution.findMany({
        where: { apiRequestId: { in: apiRequestIds } },
        select: { passed: true },
      });
      apiTestingSummary = {
        totalRequests: apiRequests.length,
        totalExecutions: apiExecutions.length,
        passedCount: apiExecutions.filter((execution) => execution.passed === true).length,
        failedCount: apiExecutions.filter((execution) => execution.passed === false).length,
        noAssertionCount: apiExecutions.filter((execution) => execution.passed === null).length,
      };
      failedApiTestCount = apiTestingSummary.failedCount;
    }

    // ---- Performance (where available) ----
    let performanceSummary: {
      total: number;
      passed: number;
      failed: number;
      queuedOrRunning: number;
      stopped: number;
      neverRun: number;
    } | null = null;
    let failedPerformanceTestCount = 0;
    if (performanceTests.length > 0) {
      const counts = { passed: 0, failed: 0, queuedOrRunning: 0, stopped: 0, neverRun: 0 };
      for (const test of performanceTests) {
        switch (test.lastRunStatus) {
          case 'PASSED':
            counts.passed += 1;
            break;
          case 'FAILED':
            counts.failed += 1;
            break;
          case 'QUEUED':
          case 'RUNNING':
            counts.queuedOrRunning += 1;
            break;
          case 'STOPPED':
            counts.stopped += 1;
            break;
          default:
            counts.neverRun += 1;
        }
      }
      failedPerformanceTestCount = counts.failed;
      performanceSummary = { total: performanceTests.length, ...counts };
    }

    // ---- Security (where available) ----
    let securitySummary: {
      totalTests: number;
      totalFindings: number;
      severityCounts: { critical: number; high: number; medium: number; low: number; info: number };
      statusCounts: { open: number; inProgress: number; resolved: number; reopened: number; accepted: number };
      openCriticalHighCount: number;
    } | null = null;
    let openCriticalHighFindingCount = 0;
    if (securityTests.length > 0) {
      const securityTestIds = securityTests.map((test) => test.id);
      const findings = await this.prisma.securityFinding.findMany({
        where: { securityTestId: { in: securityTestIds } },
        select: { severity: true, status: true },
      });
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      const statusCounts = { open: 0, inProgress: 0, resolved: 0, reopened: 0, accepted: 0 };
      for (const finding of findings) {
        switch (finding.severity) {
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
        switch (finding.status) {
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
      openCriticalHighFindingCount = findings.filter(
        (finding) =>
          (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') &&
          (finding.status === 'OPEN' || finding.status === 'IN_PROGRESS' || finding.status === 'REOPENED'),
      ).length;
      securitySummary = {
        totalTests: securityTests.length,
        totalFindings: findings.length,
        severityCounts,
        statusCounts,
        openCriticalHighCount: openCriticalHighFindingCount,
      };
    }

    // ---- UAT (where available) ----
    let uatSummary: {
      totalCycles: number;
      statusCounts: { planned: number; inProgress: number; completed: number; approved: number; rejected: number };
      latestCycle: {
        id: string;
        name: string;
        status: string;
        signOffBy: string | null;
        signOffAt: Date | null;
      } | null;
    } | null = null;
    let rejectedUatCycleCount = 0;
    let approvedUatCycleCount = 0;
    if (uatCycles.length > 0) {
      const statusCounts = { planned: 0, inProgress: 0, completed: 0, approved: 0, rejected: 0 };
      for (const cycle of uatCycles) {
        switch (cycle.status) {
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
      rejectedUatCycleCount = statusCounts.rejected;
      approvedUatCycleCount = statusCounts.approved;
      const latest = uatCycles[0];
      uatSummary = {
        totalCycles: uatCycles.length,
        statusCounts,
        latestCycle: {
          id: latest.id,
          name: latest.name,
          status: latest.status,
          signOffBy: latest.signOffBy,
          signOffAt: latest.signOffAt,
        },
      };
    }

    const gates = evaluateGates({
      executedTestCases,
      passRatePercent,
      testCoveragePercent,
      requirementCoveragePercent,
      openCriticalDefectCount,
      openCriticalMajorDefectCount,
      openCriticalHighFindingCount,
      failedWithoutDefectCount,
      rejectedUatCycleCount,
      totalUatCycles: uatCycles.length,
      approvedUatCycleCount,
      failedPerformanceTestCount,
      failedAutomationCount,
      failedApiTestCount,
    });

    return {
      testExecutionSummary: {
        totalTestCases,
        executedTestCases,
        resultCounts,
        testCoveragePercent,
        passRatePercent,
      },
      requirementCoverage: {
        totalRequirements,
        coveredRequirements,
        requirementCoveragePercent,
      },
      defects: {
        openCount: openDefects.length,
        criticalOpenCount: openCriticalDefectCount,
        criticalMajorOpenCount: openCriticalMajorDefectCount,
        statusCounts: defectStatusCounts,
      },
      automation: automationSummary,
      apiTesting: apiTestingSummary,
      performance: performanceSummary,
      security: securitySummary,
      uat: uatSummary,
      failedWithoutDefectCount,
      gates,
      readiness: computeReadiness(gates),
    };
  }

  private async validateEnvironmentBelongsToProduct(environmentId: string, productId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true, productId: true },
    });
    if (!environment) {
      throw new BadRequestException(`Environment ${environmentId} not found`);
    }
    if (environment.productId !== productId) {
      throw new BadRequestException(`Environment ${environmentId} does not belong to the selected product.`);
    }
  }
}
