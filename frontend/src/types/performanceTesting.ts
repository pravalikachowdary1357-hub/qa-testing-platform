// HTTP methods read fine as-is in the UI, mirroring ApiTesting's convention.
export type PerfHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Raw Prisma enum values as returned by the backend.
export type PerformanceRunStatus = 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'STOPPED';

// Human-readable labels for PerformanceRunStatus, used by StatusChip.
export type PerformanceRunStatusLabel = 'Queued' | 'Running' | 'Passed' | 'Failed' | 'Stopped';

export const RUN_STATUS_LABELS: Record<PerformanceRunStatus, PerformanceRunStatusLabel> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  PASSED: 'Passed',
  FAILED: 'Failed',
  STOPPED: 'Stopped',
};

export interface PerformanceTestProductRef {
  id: string;
  name: string;
}

export interface PerformanceTestEnvironmentRef {
  id: string;
  name: string;
  baseUrl: string | null;
}

export interface PerformanceTestRun {
  id: string;
  performanceTestId: string;
  status: PerformanceRunStatus;
  startedAt: string;
  finishedAt: string | null;
  totalRequests: number | null;
  failedRequests: number | null;
  avgResponseTimeMs: number | null;
  minResponseTimeMs: number | null;
  maxResponseTimeMs: number | null;
  p95ResponseTimeMs: number | null;
  throughputRps: number | null;
  errorRatePercent: number | null;
  thresholdsPassed: boolean | null;
  errorMessage: string | null;
}

// The small subset of PerformanceTestRun shown in the list view's "last run" glance column.
export interface PerformanceTestRunSummary {
  id: string;
  status: PerformanceRunStatus;
  startedAt: string;
  finishedAt: string | null;
  totalRequests: number | null;
  failedRequests: number | null;
  avgResponseTimeMs: number | null;
  throughputRps: number | null;
  errorRatePercent: number | null;
  thresholdsPassed: boolean | null;
}

export interface PerformanceTestListItem {
  id: string;
  productId: string;
  environmentId: string | null;
  name: string;
  description: string | null;
  targetUrl: string;
  method: PerfHttpMethod;
  headers: Record<string, string> | null;
  body: string | null;
  virtualUsers: number;
  rampUpSeconds: number;
  durationSeconds: number;
  iterations: number | null;
  thresholdResponseTimeMs: number | null;
  thresholdErrorRatePercent: number | null;
  thresholdThroughputRps: number | null;
  lastRunStatus: PerformanceRunStatus | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: PerformanceTestProductRef;
  environment: PerformanceTestEnvironmentRef | null;
  lastRun: PerformanceTestRunSummary | null;
}

export interface PerformanceTest extends PerformanceTestListItem {
  runs: PerformanceTestRun[];
}

export interface CreatePerformanceTestPayload {
  productId: string;
  environmentId?: string;
  name: string;
  description?: string;
  targetUrl: string;
  method?: PerfHttpMethod;
  headers?: Record<string, string>;
  body?: string;
  virtualUsers: number;
  rampUpSeconds: number;
  durationSeconds: number;
  iterations?: number;
  thresholdResponseTimeMs?: number;
  thresholdErrorRatePercent?: number;
  thresholdThroughputRps?: number;
}

export type UpdatePerformanceTestPayload = Partial<CreatePerformanceTestPayload>;
