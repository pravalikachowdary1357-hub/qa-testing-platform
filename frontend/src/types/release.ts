export type ReleaseStatus = 'PLANNED' | 'IN_TESTING' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
export type ReleaseStatusLabel = 'Planned' | 'In Testing' | 'Completed' | 'Approved' | 'Rejected';

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, ReleaseStatusLabel> = {
  PLANNED: 'Planned',
  IN_TESTING: 'In Testing',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Only these three are settable via a plain edit -- APPROVED/REJECTED
// require the dedicated sign-off action (see SignOffReleaseDialog).
export const EDITABLE_RELEASE_STATUSES: ReleaseStatus[] = ['PLANNED', 'IN_TESTING', 'COMPLETED'];

export type ReleaseReadiness = 'READY' | 'CONDITIONAL' | 'NOT_READY';
export type ReleaseReadinessLabel = 'Ready' | 'Conditionally Ready' | 'Not Ready';

export const READINESS_LABELS: Record<ReleaseReadiness, ReleaseReadinessLabel> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditionally Ready',
  NOT_READY: 'Not Ready',
};

export const ALL_READINESS_VALUES: ReleaseReadiness[] = ['READY', 'CONDITIONAL', 'NOT_READY'];

export interface ReleaseProductRef {
  id: string;
  name: string;
}

export interface ReleaseEnvironmentRef {
  id: string;
  name: string;
}

// Shared shape for the `release` reference embedded on lifecycle records
// (Requirement, TestPlan, TestScenario, TestCase, TestExecution, Defect,
// UatCycle, Automation, ApiTestRequest, PerformanceTest, SecurityTest) --
// mirrors the backend's RELEASE_REF_SELECT (id/name/version) on all of them.
export interface ApiReleaseRef {
  id: string;
  name: string;
  version: string;
}

export interface QualityGateResult {
  key: string;
  label: string;
  impact: 'BLOCKING' | 'WARNING';
  passed: boolean;
  detail: string;
}

export interface ResultCounts {
  pass: number;
  fail: number;
  blocked: number;
  pending: number;
  notRun: number;
}

export interface TestExecutionSummary {
  totalTestCases: number;
  executedTestCases: number;
  resultCounts: ResultCounts;
  testCoveragePercent: number;
  passRatePercent: number;
}

export interface RequirementCoverageSummary {
  totalRequirements: number;
  coveredRequirements: number;
  requirementCoveragePercent: number;
}

export interface DefectQualitySummary {
  openCount: number;
  criticalOpenCount: number;
  criticalMajorOpenCount: number;
  statusCounts: { open: number; inProgress: number; resolved: number; reopened: number; closed: number };
}

export interface AutomationQualitySummary {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
}

export interface ApiTestingQualitySummary {
  totalRequests: number;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  noAssertionCount: number;
}

export interface PerformanceQualitySummary {
  total: number;
  passed: number;
  failed: number;
  queuedOrRunning: number;
  stopped: number;
  neverRun: number;
}

export interface SecurityQualitySummary {
  totalTests: number;
  totalFindings: number;
  severityCounts: { critical: number; high: number; medium: number; low: number; info: number };
  statusCounts: { open: number; inProgress: number; resolved: number; reopened: number; accepted: number };
  openCriticalHighCount: number;
}

export interface UatLatestCycleRef {
  id: string;
  name: string;
  status: string;
  signOffBy: string | null;
  signOffAt: string | null;
}

export interface UatQualitySummary {
  totalCycles: number;
  statusCounts: { planned: number; inProgress: number; completed: number; approved: number; rejected: number };
  latestCycle: UatLatestCycleRef | null;
}

export interface ReleaseQuality {
  testExecutionSummary: TestExecutionSummary;
  requirementCoverage: RequirementCoverageSummary;
  defects: DefectQualitySummary;
  automation: AutomationQualitySummary | null;
  apiTesting: ApiTestingQualitySummary | null;
  performance: PerformanceQualitySummary | null;
  security: SecurityQualitySummary | null;
  uat: UatQualitySummary | null;
  failedWithoutDefectCount: number;
  gates: QualityGateResult[];
  readiness: ReleaseReadiness;
}

export interface ApiRelease {
  id: string;
  productId: string;
  environmentId: string | null;
  name: string;
  version: string;
  status: ReleaseStatus;
  releaseDate: string | null;
  notes: string | null;
  signOffBy: string | null;
  signOffAt: string | null;
  signOffNotes: string | null;
  createdAt: string;
  updatedAt: string;
  product: ReleaseProductRef;
  environment: ReleaseEnvironmentRef | null;
  quality: ReleaseQuality;
}

export interface CreateReleasePayload {
  productId: string;
  // null and undefined both mean "no environment"; PATCH also uses null to
  // explicitly clear an existing link.
  environmentId?: string | null;
  name: string;
  version: string;
  releaseDate?: string | null;
  notes?: string;
}

export interface UpdateReleasePayload {
  productId?: string;
  environmentId?: string | null;
  name?: string;
  version?: string;
  status?: 'PLANNED' | 'IN_TESTING' | 'COMPLETED';
  releaseDate?: string | null;
  notes?: string;
}

export interface SignOffReleasePayload {
  decision: 'APPROVED' | 'REJECTED';
  signOffBy: string;
  signOffNotes?: string;
}
