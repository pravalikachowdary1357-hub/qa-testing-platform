import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const PRODUCT_REF_SELECT = { select: { id: true, name: true } };

const REQUIREMENT_INCLUDE = { product: PRODUCT_REF_SELECT };

const TEST_SCENARIO_INCLUDE = {
  product: PRODUCT_REF_SELECT,
  requirement: { select: { id: true, title: true } },
};

const TEST_CASE_INCLUDE = {
  testScenario: {
    select: {
      id: true,
      title: true,
      productId: true,
      requirementId: true,
      product: PRODUCT_REF_SELECT,
      requirement: { select: { id: true, title: true } },
    },
  },
};

const TEST_EXECUTION_INCLUDE = {
  environment: { select: { id: true, name: true } },
};

const DEFECT_INCLUDE = { product: PRODUCT_REF_SELECT };

type ResultCounts = {
  pass: number;
  fail: number;
  blocked: number;
  pending: number;
  notRun: number;
};

function emptyCounts(): ResultCounts {
  return { pass: 0, fail: 0, blocked: 0, pending: 0, notRun: 0 };
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getMatrix(productId?: string) {
    const [requirements, testScenarios, testCases, testExecutions, defects] = await Promise.all([
      this.prisma.requirement.findMany({
        where: productId ? { productId } : {},
        include: REQUIREMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testScenario.findMany({
        where: productId ? { productId } : {},
        include: TEST_SCENARIO_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testCase.findMany({
        where: productId ? { testScenario: { productId } } : {},
        include: TEST_CASE_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testExecution.findMany({
        where: productId ? { testCase: { testScenario: { productId } } } : {},
        include: TEST_EXECUTION_INCLUDE,
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.defect.findMany({
        where: productId ? { productId } : {},
        include: DEFECT_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const testCaseById = new Map(testCases.map((testCase) => [testCase.id, testCase]));

    // executedAt desc ordering means each bucket's first entry is the latest.
    const executionsByTestCaseId = new Map<string, typeof testExecutions>();
    for (const execution of testExecutions) {
      const bucket = executionsByTestCaseId.get(execution.testCaseId);
      if (bucket) bucket.push(execution);
      else executionsByTestCaseId.set(execution.testCaseId, [execution]);
    }

    const defectsByTestCaseId = new Map<string, typeof defects>();
    const defectsByTestExecutionId = new Map<string, typeof defects>();
    for (const defect of defects) {
      if (defect.testCaseId) {
        const bucket = defectsByTestCaseId.get(defect.testCaseId);
        if (bucket) bucket.push(defect);
        else defectsByTestCaseId.set(defect.testCaseId, [defect]);
      }
      if (defect.testExecutionId) {
        const bucket = defectsByTestExecutionId.get(defect.testExecutionId);
        if (bucket) bucket.push(defect);
        else defectsByTestExecutionId.set(defect.testExecutionId, [defect]);
      }
    }

    const testCasesByScenarioId = new Map<string, typeof testCases>();
    for (const testCase of testCases) {
      const bucket = testCasesByScenarioId.get(testCase.testScenarioId);
      if (bucket) bucket.push(testCase);
      else testCasesByScenarioId.set(testCase.testScenarioId, [testCase]);
    }

    const buildTestCaseNode = (testCase: (typeof testCases)[number]) => {
      const executions = executionsByTestCaseId.get(testCase.id) ?? [];
      const latest = executions[0] ?? null;
      const latestExecutionStatus: string = latest ? latest.status : 'NOT_RUN';

      const linkedDefectsById = new Map<string, (typeof defects)[number]>();
      for (const defect of defectsByTestCaseId.get(testCase.id) ?? []) {
        linkedDefectsById.set(defect.id, defect);
      }
      for (const execution of executions) {
        for (const defect of defectsByTestExecutionId.get(execution.id) ?? []) {
          linkedDefectsById.set(defect.id, defect);
        }
      }
      const linkedDefects = [...linkedDefectsById.values()];

      return {
        id: testCase.id,
        title: testCase.title,
        priority: testCase.priority,
        status: testCase.status,
        executionCount: executions.length,
        latestExecution: latest
          ? {
              id: latest.id,
              status: latest.status,
              executedAt: latest.executedAt,
              executedBy: latest.executedBy,
              environment: latest.environment,
            }
          : null,
        latestExecutionStatus,
        coverageStatus: executions.length > 0 ? 'EXECUTED' : 'NOT_EXECUTED',
        defectCount: linkedDefects.length,
        defects: linkedDefects.map((defect) => ({
          id: defect.id,
          title: defect.title,
          severity: defect.severity,
          status: defect.status,
        })),
      };
    };

    const rollupCounts = (nodes: Array<{ latestExecutionStatus: string }>): ResultCounts => {
      const counts = emptyCounts();
      for (const node of nodes) {
        switch (node.latestExecutionStatus) {
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
      return counts;
    };

    // Precedence (most to least severe): a single failing test case fails the
    // whole requirement even if others pass; blocked outranks partial progress;
    // "passed" requires every test case to have a passing latest result.
    const computeCoverageStatus = (counts: ResultCounts, testCaseCount: number): string => {
      if (testCaseCount === 0) return 'NOT_COVERED';
      if (counts.fail > 0) return 'FAILED';
      if (counts.blocked > 0) return 'BLOCKED';
      if (counts.pass === testCaseCount) return 'PASSED';
      if (counts.pass > 0 || counts.pending > 0) return 'IN_PROGRESS';
      return 'NOT_EXECUTED';
    };

    const allScenarioNodes = testScenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      type: scenario.type,
      priority: scenario.priority,
      status: scenario.status,
      product: scenario.product,
      requirementId: scenario.requirementId,
      testCases: (testCasesByScenarioId.get(scenario.id) ?? []).map(buildTestCaseNode),
    }));

    const requirementRows = requirements.map((requirement) => {
      const scenarios = allScenarioNodes.filter((node) => node.requirementId === requirement.id);
      const allCases = scenarios.flatMap((scenario) => scenario.testCases);
      const counts = rollupCounts(allCases);
      const testCaseCount = allCases.length;
      const executedCount = testCaseCount - counts.notRun;
      const defectCount = allCases.reduce((sum, node) => sum + node.defectCount, 0);

      return {
        id: requirement.id,
        title: requirement.title,
        priority: requirement.priority,
        status: requirement.status,
        productId: requirement.productId,
        product: requirement.product,
        testScenarioCount: scenarios.length,
        testCaseCount,
        executedCount,
        coveragePercent: percent(executedCount, testCaseCount),
        resultCounts: counts,
        defectCount,
        coverageStatus: computeCoverageStatus(counts, testCaseCount),
        testScenarios: scenarios,
      };
    });

    const unlinkedTestScenarios = allScenarioNodes
      .filter((scenario) => !scenario.requirementId)
      .map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        type: scenario.type,
        priority: scenario.priority,
        status: scenario.status,
        product: scenario.product,
        testCaseCount: scenario.testCases.length,
      }));

    const orphanTestCases = testCases
      .filter((testCase) => (executionsByTestCaseId.get(testCase.id)?.length ?? 0) === 0)
      .map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        priority: testCase.priority,
        status: testCase.status,
        testScenario: { id: testCase.testScenario.id, title: testCase.testScenario.title },
        requirement: testCase.testScenario.requirement,
        product: testCase.testScenario.product,
      }));

    // Only the latest execution per test case counts as an outstanding gap — a
    // failure that was later superseded by a passing retest is resolved, not a
    // gap, even if nobody ever filed a defect for the earlier failed attempt.
    const isLatestExecution = (execution: (typeof testExecutions)[number]) =>
      executionsByTestCaseId.get(execution.testCaseId)?.[0]?.id === execution.id;

    const failedExecutionsWithoutDefects = testExecutions
      .filter(
        (execution) =>
          execution.status === 'FAIL' &&
          isLatestExecution(execution) &&
          (defectsByTestExecutionId.get(execution.id)?.length ?? 0) === 0,
      )
      .map((execution) => {
        const testCase = testCaseById.get(execution.testCaseId) ?? null;
        return {
          id: execution.id,
          status: execution.status,
          executedAt: execution.executedAt,
          executedBy: execution.executedBy,
          testCase: testCase ? { id: testCase.id, title: testCase.title } : null,
          environment: execution.environment,
          product: testCase?.testScenario.product ?? null,
        };
      });

    const defectsWithoutLinkage = defects
      .filter((defect) => !defect.testCaseId && !defect.testExecutionId)
      .map((defect) => ({
        id: defect.id,
        title: defect.title,
        severity: defect.severity,
        status: defect.status,
        createdAt: defect.createdAt,
        product: defect.product,
      }));

    const allTestCaseNodes = allScenarioNodes.flatMap((scenario) => scenario.testCases);
    const globalCounts = rollupCounts(allTestCaseNodes);
    const totalTestCases = allTestCaseNodes.length;
    const testCasesExecuted = totalTestCases - globalCounts.notRun;
    const requirementsCovered = requirementRows.filter((row) => row.testScenarioCount > 0).length;

    const summary = {
      totalRequirements: requirements.length,
      requirementsCovered,
      requirementCoveragePercent: percent(requirementsCovered, requirements.length),
      totalTestScenarios: testScenarios.length,
      unlinkedTestScenarioCount: unlinkedTestScenarios.length,
      totalTestCases,
      testCasesExecuted,
      testCaseCoveragePercent: percent(testCasesExecuted, totalTestCases),
      passRatePercent: percent(globalCounts.pass, testCasesExecuted),
      resultCounts: globalCounts,
      totalDefects: defects.length,
      orphanTestCaseCount: orphanTestCases.length,
      failedWithoutDefectCount: failedExecutionsWithoutDefects.length,
      defectsWithoutLinkageCount: defectsWithoutLinkage.length,
    };

    return {
      requirements: requirementRows,
      unlinkedTestScenarios,
      orphanTestCases,
      failedExecutionsWithoutDefects,
      defectsWithoutLinkage,
      summary,
    };
  }
}
