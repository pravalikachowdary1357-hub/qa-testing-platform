import type { ApiRequirementPriority, ApiRequirementStatus } from './requirement';
import type {
  ApiTestScenarioPriority,
  ApiTestScenarioStatus,
  ApiTestScenarioType,
} from './testScenario';
import type { ApiTestCasePriority, ApiTestCaseStatus } from './testCase';
import type { ApiTestExecutionStatus } from './testExecution';
import type { ApiDefectSeverity, ApiDefectStatus } from './defect';

// Human-readable labels rendered by StatusChip. NOT_RUN/EXECUTED/NOT_EXECUTED and
// the coverage-status values are computed by the backend from real relationships —
// they are not raw Prisma enums, but are rendered the same way as one.
export type LatestExecutionStatus = ApiTestExecutionStatus | 'NOT_RUN';
export type TestCaseCoverageStatus = 'EXECUTED' | 'NOT_EXECUTED';
export type RequirementCoverageStatus =
  | 'NOT_COVERED'
  | 'NOT_EXECUTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'FAILED'
  | 'PASSED';

export const COVERAGE_STATUS_LABELS: Record<RequirementCoverageStatus, string> = {
  NOT_COVERED: 'Not Covered',
  NOT_EXECUTED: 'Not Executed',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  FAILED: 'Failed',
  PASSED: 'Passed',
};

export const LATEST_EXECUTION_STATUS_LABELS: Record<LatestExecutionStatus, string> = {
  NOT_RUN: 'Not Run',
  PENDING: 'Pending',
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
};

export const TEST_CASE_COVERAGE_STATUS_LABELS: Record<TestCaseCoverageStatus, string> = {
  EXECUTED: 'Executed',
  NOT_EXECUTED: 'Not Executed',
};

export interface TraceabilityProductRef {
  id: string;
  name: string;
}

export interface TraceabilityRequirementRef {
  id: string;
  title: string;
}

export interface TraceabilityEnvironmentRef {
  id: string;
  name: string;
}

export interface TraceabilityDefectRef {
  id: string;
  title: string;
  severity: ApiDefectSeverity;
  status: ApiDefectStatus;
}

export interface TraceabilityLatestExecution {
  id: string;
  status: ApiTestExecutionStatus;
  executedAt: string;
  executedBy: string;
  environment: TraceabilityEnvironmentRef;
}

export interface TraceabilityTestCaseNode {
  id: string;
  title: string;
  priority: ApiTestCasePriority;
  status: ApiTestCaseStatus;
  executionCount: number;
  latestExecution: TraceabilityLatestExecution | null;
  latestExecutionStatus: LatestExecutionStatus;
  coverageStatus: TestCaseCoverageStatus;
  defectCount: number;
  defects: TraceabilityDefectRef[];
}

export interface TraceabilityScenarioNode {
  id: string;
  title: string;
  type: ApiTestScenarioType;
  priority: ApiTestScenarioPriority;
  status: ApiTestScenarioStatus;
  product: TraceabilityProductRef;
  requirementId: string | null;
  testCases: TraceabilityTestCaseNode[];
}

export interface TraceabilityResultCounts {
  pass: number;
  fail: number;
  blocked: number;
  pending: number;
  notRun: number;
}

export interface TraceabilityRequirementRow {
  id: string;
  title: string;
  priority: ApiRequirementPriority;
  status: ApiRequirementStatus;
  productId: string;
  product: TraceabilityProductRef;
  testScenarioCount: number;
  testCaseCount: number;
  executedCount: number;
  coveragePercent: number;
  resultCounts: TraceabilityResultCounts;
  defectCount: number;
  coverageStatus: RequirementCoverageStatus;
  testScenarios: TraceabilityScenarioNode[];
}

export interface TraceabilityUnlinkedScenario {
  id: string;
  title: string;
  type: ApiTestScenarioType;
  priority: ApiTestScenarioPriority;
  status: ApiTestScenarioStatus;
  product: TraceabilityProductRef;
  testCaseCount: number;
}

export interface TraceabilityOrphanTestCase {
  id: string;
  title: string;
  priority: ApiTestCasePriority;
  status: ApiTestCaseStatus;
  testScenario: { id: string; title: string };
  requirement: TraceabilityRequirementRef | null;
  product: TraceabilityProductRef;
}

export interface TraceabilityFailedExecution {
  id: string;
  status: ApiTestExecutionStatus;
  executedAt: string;
  executedBy: string;
  testCase: { id: string; title: string } | null;
  environment: TraceabilityEnvironmentRef;
  product: TraceabilityProductRef | null;
}

export interface TraceabilityUnlinkedDefect {
  id: string;
  title: string;
  severity: ApiDefectSeverity;
  status: ApiDefectStatus;
  createdAt: string;
  product: TraceabilityProductRef;
}

export interface TraceabilitySummary {
  totalRequirements: number;
  requirementsCovered: number;
  requirementCoveragePercent: number;
  totalTestScenarios: number;
  unlinkedTestScenarioCount: number;
  totalTestCases: number;
  testCasesExecuted: number;
  testCaseCoveragePercent: number;
  passRatePercent: number;
  resultCounts: TraceabilityResultCounts;
  totalDefects: number;
  orphanTestCaseCount: number;
  failedWithoutDefectCount: number;
  defectsWithoutLinkageCount: number;
}

export interface TraceabilityMatrix {
  requirements: TraceabilityRequirementRow[];
  unlinkedTestScenarios: TraceabilityUnlinkedScenario[];
  orphanTestCases: TraceabilityOrphanTestCase[];
  failedExecutionsWithoutDefects: TraceabilityFailedExecution[];
  defectsWithoutLinkage: TraceabilityUnlinkedDefect[];
  summary: TraceabilitySummary;
}
