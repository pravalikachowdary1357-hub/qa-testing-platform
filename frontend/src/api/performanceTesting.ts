import { apiFetch } from './client';
import type {
  CreatePerformanceTestPayload,
  PerformanceTest,
  PerformanceTestListItem,
  PerformanceTestRun,
  PerformanceTestRunSummary,
  UpdatePerformanceTestPayload,
} from '../types/performanceTesting';

// Wire shapes exactly mirroring what the backend sends over HTTP (see
// PerformanceTestingService's findAll/findOne/create/update). These are
// reshaped below into the friendlier `lastRun` (singular, list view) /
// `runs` (full history, detail view) fields used by the frontend.
type PerformanceTestBaseWire = Omit<PerformanceTestListItem, 'lastRun'>;

interface PerformanceTestListWire extends PerformanceTestBaseWire {
  runs: PerformanceTestRunSummary[];
}

interface PerformanceTestDetailWire extends PerformanceTestBaseWire {
  runs: PerformanceTestRun[];
}

function baseFields(wire: PerformanceTestBaseWire): PerformanceTestBaseWire {
  return {
    id: wire.id,
    productId: wire.productId,
    environmentId: wire.environmentId,
    releaseId: wire.releaseId,
    name: wire.name,
    description: wire.description,
    targetUrl: wire.targetUrl,
    method: wire.method,
    headers: wire.headers,
    body: wire.body,
    virtualUsers: wire.virtualUsers,
    rampUpSeconds: wire.rampUpSeconds,
    durationSeconds: wire.durationSeconds,
    iterations: wire.iterations,
    thresholdResponseTimeMs: wire.thresholdResponseTimeMs,
    thresholdErrorRatePercent: wire.thresholdErrorRatePercent,
    thresholdThroughputRps: wire.thresholdThroughputRps,
    lastRunStatus: wire.lastRunStatus,
    lastRunAt: wire.lastRunAt,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    product: wire.product,
    environment: wire.environment,
    release: wire.release,
  };
}

function toSummary(run: PerformanceTestRun): PerformanceTestRunSummary {
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    totalRequests: run.totalRequests,
    failedRequests: run.failedRequests,
    avgResponseTimeMs: run.avgResponseTimeMs,
    throughputRps: run.throughputRps,
    errorRatePercent: run.errorRatePercent,
    thresholdsPassed: run.thresholdsPassed,
  };
}

function toListItem(wire: PerformanceTestListWire): PerformanceTestListItem {
  return { ...baseFields(wire), lastRun: wire.runs[0] ?? null };
}

function toDetail(wire: PerformanceTestDetailWire): PerformanceTest {
  return { ...baseFields(wire), runs: wire.runs, lastRun: wire.runs[0] ? toSummary(wire.runs[0]) : null };
}

function toMutationResult(wire: PerformanceTestListWire): PerformanceTestListItem {
  return toListItem(wire);
}

export async function fetchPerformanceTests(productId?: string): Promise<PerformanceTestListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  const data = await apiFetch<PerformanceTestListWire[]>(`/performance-tests${qs}`);
  return data.map(toListItem);
}

export async function fetchPerformanceTest(id: string): Promise<PerformanceTest> {
  const data = await apiFetch<PerformanceTestDetailWire>(`/performance-tests/${id}`);
  return toDetail(data);
}

export async function createPerformanceTest(
  data: CreatePerformanceTestPayload,
): Promise<PerformanceTestListItem> {
  const wire = await apiFetch<PerformanceTestListWire>('/performance-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return toMutationResult(wire);
}

export async function updatePerformanceTest(
  id: string,
  data: UpdatePerformanceTestPayload,
): Promise<PerformanceTestListItem> {
  const wire = await apiFetch<PerformanceTestListWire>(`/performance-tests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return toMutationResult(wire);
}

export function deletePerformanceTest(id: string): Promise<void> {
  return apiFetch<void>(`/performance-tests/${id}`, { method: 'DELETE' });
}

export function runPerformanceTest(id: string): Promise<PerformanceTestRun> {
  return apiFetch<PerformanceTestRun>(`/performance-tests/${id}/run`, { method: 'POST' });
}

export function stopPerformanceTest(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/performance-tests/${id}/stop`, { method: 'POST' });
}
