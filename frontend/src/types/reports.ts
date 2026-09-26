export interface ReportProductRef {
  id: string;
  name: string;
}

export interface ReportEnvironmentRef {
  id: string;
  name: string;
}

export interface ReportFilterParams {
  productId?: string;
  environmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ResultCounts {
  pass: number;
  fail: number;
  blocked: number;
  pending: number;
  notRun: number;
}

// ---------- Overview ----------
export interface OverviewReport {
  filtersApplied: { productId: string | null; dateFrom: string | null; dateTo: string | null };
  productCount: number;
  requirementCoverage: { totalRequirements: number; coveredRequirements: number; requirementCoveragePercent: number };
  testExecution: {
    totalTestCases: number;
    executedTestCases: number;
    testCoveragePercent: number;
    passRatePercent: number;
    resultCounts: ResultCounts;
  };
  defects: { total: number; openCount: number; criticalOpenCount: number };
  automation: { total: number; passRatePercent: number } | null;
  apiTesting: { total: number; passRatePercent: number } | null;
  performance: { total: number; passRatePercent: number } | null;
  security: { totalFindings: number; openCriticalHighCount: number } | null;
  uat: { totalCycles: number; approved: number; rejected: number; pending: number } | null;
  releaseQuality: { total: number; ready: number; conditional: number; notReady: number } | null;
}

// ---------- Test Execution Report ----------
export interface TestExecutionReportRow {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  product: ReportProductRef;
  environment: ReportEnvironmentRef;
  status: string;
  executedBy: string;
  executedAt: string;
  actualResult: string | null;
  notes: string | null;
}

export interface TestExecutionReport {
  filtersApplied: ReportFilterParams & { status: string | null };
  summary: { total: number; resultCounts: ResultCounts; passRatePercent: number };
  rows: TestExecutionReportRow[];
  rowsTotal: number;
  rowsTruncated: boolean;
}

// ---------- Test Case Status Report ----------
export interface TestCaseStatusReportRow {
  id: string;
  title: string;
  priority: string;
  lifecycleStatus: string;
  latestResultStatus: string;
  product: ReportProductRef;
  testScenario: { id: string; title: string };
}

export interface TestCaseStatusReport {
  filtersApplied: ReportFilterParams & { lifecycleStatus: string | null; resultStatus: string | null };
  summary: {
    total: number;
    lifecycleCounts: { draft: number; ready: number; approved: number; deprecated: number };
    resultCounts: ResultCounts;
    testCoveragePercent: number;
    passRatePercent: number;
  };
  rows: TestCaseStatusReportRow[];
}

// ---------- Requirement Coverage Report ----------
export interface RequirementCoverageReportRow {
  id: string;
  title: string;
  priority: string;
  status: string;
  product: ReportProductRef;
  testScenarioCount: number;
  testCaseCount: number;
  executedCount: number;
  coveragePercent: number;
  resultCounts: ResultCounts;
  coverageStatus: string;
}

export interface RequirementCoverageReport {
  filtersApplied: { productId: string | null };
  summary: {
    totalRequirements: number;
    coveredRequirements: number;
    requirementCoveragePercent: number;
    fullyPassed: number;
    notCovered: number;
  };
  rows: RequirementCoverageReportRow[];
}

// ---------- Traceability Report ----------
export interface TraceabilityGapRow {
  id: string;
  title?: string;
  testCaseId?: string;
  testCaseTitle?: string;
  product: ReportProductRef | null;
}

export interface TraceabilityReport {
  filtersApplied: { productId: string | null };
  summary: {
    totalRequirements: number;
    requirementsCovered: number;
    requirementCoveragePercent: number;
    totalTestScenarios: number;
    unlinkedTestScenarioCount: number;
    totalTestCases: number;
    testCasesExecuted: number;
    testCaseCoveragePercent: number;
    passRatePercent: number;
    resultCounts: ResultCounts;
    totalDefects: number;
    orphanTestCaseCount: number;
    failedWithoutDefectCount: number;
    defectsWithoutLinkageCount: number;
  };
  gaps: {
    orphanTestCases: TraceabilityGapRow[];
    failedWithoutDefects: TraceabilityGapRow[];
  };
  fullMatrixPath: string;
}

// ---------- Defect Report ----------
export interface DefectReportRow {
  id: string;
  title: string;
  severity: string;
  priority: string;
  status: string;
  product: ReportProductRef;
  environment: ReportEnvironmentRef | null;
  testCase: { id: string; title: string } | null;
  assignedTo: string | null;
  createdAt: string;
}

export interface DefectReport {
  filtersApplied: ReportFilterParams & { status: string | null; severity: string | null };
  summary: {
    total: number;
    openCount: number;
    criticalOpenCount: number;
    statusCounts: { open: number; inProgress: number; resolved: number; reopened: number; closed: number; deferred?: number };
    severityCounts: { critical: number; major: number; minor: number; trivial: number };
    priorityCounts: { critical: number; high: number; medium: number; low: number };
  };
  rows: DefectReportRow[];
}

// ---------- Automation Report ----------
export interface AutomationReportRow {
  id: string;
  automationId: string;
  automationName: string;
  type?: string;
  framework?: string;
  product: ReportProductRef | null;
  environment: ReportEnvironmentRef | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordedBy: string;
  notes: string | null;
}

export interface AutomationReport {
  filtersApplied: ReportFilterParams & { status: string | null };
  summary: {
    totalAutomations: number;
    resultCounts: { pass: number; fail: number; blocked: number; notRun: number };
    passRatePercent: number;
    totalRuns: number;
  };
  rows: AutomationReportRow[];
  rowsTotal: number;
  rowsTruncated: boolean;
}

// ---------- API Testing Report ----------
export interface ApiTestingReportRow {
  id: string;
  requestId: string;
  requestName: string;
  method?: string;
  url?: string;
  product: ReportProductRef | null;
  environment: ReportEnvironmentRef | null;
  statusCode: number | null;
  responseTimeMs: number | null;
  passed: boolean | null;
  errorMessage: string | null;
  executedAt: string;
}

export interface ApiTestingReport {
  filtersApplied: ReportFilterParams & { status: string | null };
  summary: {
    totalRequests: number;
    totalExecutions: number;
    passedCount: number;
    failedCount: number;
    noAssertionCount: number;
    passRatePercent: number;
    avgResponseTimeMs: number;
  };
  rows: ApiTestingReportRow[];
  rowsTotal: number;
  rowsTruncated: boolean;
}

// ---------- Performance Report ----------
export interface PerformanceReportRow {
  id: string;
  testId: string;
  testName: string;
  product: ReportProductRef | null;
  environment: ReportEnvironmentRef | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  avgResponseTimeMs: number | null;
  p95ResponseTimeMs: number | null;
  throughputRps: number | null;
  errorRatePercent: number | null;
  thresholdsPassed: boolean | null;
  errorMessage: string | null;
}

export interface PerformanceReport {
  filtersApplied: ReportFilterParams & { status: string | null };
  summary: {
    totalTests: number;
    resultCounts: { queued: number; running: number; passed: number; failed: number; stopped: number; neverRun: number };
    passRatePercent: number;
    totalRuns: number;
  };
  rows: PerformanceReportRow[];
  rowsTotal: number;
  rowsTruncated: boolean;
}

// ---------- Security Report ----------
export interface SecurityReportRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  discoveredAt: string;
  recommendation: string;
  evidence: string | null;
  testName: string;
  testType?: string;
  product: ReportProductRef | null;
  environment: ReportEnvironmentRef | null;
}

export interface SecurityReport {
  filtersApplied: ReportFilterParams & { status: string | null; severity: string | null };
  summary: {
    totalTests: number;
    totalFindings: number;
    severityCounts: { critical: number; high: number; medium: number; low: number; info: number };
    statusCounts: { open: number; inProgress: number; resolved: number; reopened: number; accepted: number };
    openCriticalHighCount: number;
  };
  rows: SecurityReportRow[];
  rowsTotal: number;
  rowsTruncated: boolean;
}

// ---------- UAT Report ----------
export interface UatReportRow {
  id: string;
  name: string;
  status: string;
  product: ReportProductRef;
  signOffBy: string | null;
  signOffAt: string | null;
  createdAt: string;
  testCaseCount: number;
}

export interface UatReport {
  filtersApplied: ReportFilterParams & { status: string | null };
  summary: {
    totalCycles: number;
    statusCounts: { planned: number; inProgress: number; completed: number; approved: number; rejected: number };
    totalUatTestCases: number;
    resultCounts: { pass: number; fail: number; blocked: number; notRun: number; notApplicable: number };
    passRatePercent: number;
  };
  rows: UatReportRow[];
}

// ---------- Release Quality Report ----------
export interface ReleaseQualityReportRow {
  id: string;
  name: string;
  version: string;
  status: string;
  releaseDate: string | null;
  product: ReportProductRef;
  environment: ReportEnvironmentRef | null;
  readiness: string;
  passRatePercent: number;
  openDefects: number;
  failingGates: { key: string; label: string; impact: 'BLOCKING' | 'WARNING' }[];
}

export interface ReleaseQualityReport {
  filtersApplied: ReportFilterParams & { status: string | null; readiness: string | null };
  summary: {
    totalReleases: number;
    readinessCounts: { ready: number; conditional: number; notReady: number };
    statusCounts: { planned: number; inTesting: number; completed: number; approved: number; rejected: number };
  };
  rows: ReleaseQualityReportRow[];
}
