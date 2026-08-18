import { apiFetch } from './client';
import type {
  CreateUatCyclePayload,
  CreateUatExecutionPayload,
  CreateUatTestCasePayload,
  SignOffUatCyclePayload,
  UatCycle,
  UatCycleListItem,
  UatExecution,
  UatTestCase,
  UpdateUatCyclePayload,
  UpdateUatExecutionPayload,
  UpdateUatTestCasePayload,
} from '../types/uat';

export function fetchUatCycles(productId?: string): Promise<UatCycleListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<UatCycleListItem[]>(`/uat-cycles${qs}`);
}

export function fetchUatCycle(id: string): Promise<UatCycle> {
  return apiFetch<UatCycle>(`/uat-cycles/${id}`);
}

export function createUatCycle(data: CreateUatCyclePayload): Promise<UatCycleListItem> {
  return apiFetch<UatCycleListItem>('/uat-cycles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUatCycle(id: string, data: UpdateUatCyclePayload): Promise<UatCycleListItem> {
  return apiFetch<UatCycleListItem>(`/uat-cycles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUatCycle(id: string): Promise<void> {
  return apiFetch<void>(`/uat-cycles/${id}`, { method: 'DELETE' });
}

export function signOffUatCycle(
  id: string,
  data: SignOffUatCyclePayload,
): Promise<UatCycleListItem> {
  return apiFetch<UatCycleListItem>(`/uat-cycles/${id}/sign-off`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addUatTestCase(
  cycleId: string,
  data: CreateUatTestCasePayload,
): Promise<UatTestCase> {
  return apiFetch<UatTestCase>(`/uat-cycles/${cycleId}/test-cases`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUatTestCase(
  cycleId: string,
  testCaseId: string,
  data: UpdateUatTestCasePayload,
): Promise<UatTestCase> {
  return apiFetch<UatTestCase>(`/uat-cycles/${cycleId}/test-cases/${testCaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUatTestCase(cycleId: string, testCaseId: string): Promise<void> {
  return apiFetch<void>(`/uat-cycles/${cycleId}/test-cases/${testCaseId}`, { method: 'DELETE' });
}

export function addUatExecution(
  cycleId: string,
  testCaseId: string,
  data: CreateUatExecutionPayload,
): Promise<UatExecution> {
  return apiFetch<UatExecution>(`/uat-cycles/${cycleId}/test-cases/${testCaseId}/executions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateUatExecution(
  cycleId: string,
  testCaseId: string,
  executionId: string,
  data: UpdateUatExecutionPayload,
): Promise<UatExecution> {
  return apiFetch<UatExecution>(
    `/uat-cycles/${cycleId}/test-cases/${testCaseId}/executions/${executionId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export function deleteUatExecution(
  cycleId: string,
  testCaseId: string,
  executionId: string,
): Promise<void> {
  return apiFetch<void>(
    `/uat-cycles/${cycleId}/test-cases/${testCaseId}/executions/${executionId}`,
    { method: 'DELETE' },
  );
}
