import { apiFetch } from './client';
import type {
  ApiTestExecution,
  CreateTestExecutionPayload,
  UpdateTestExecutionPayload,
} from '../types/testExecution';

export function fetchTestExecutions(productId?: string): Promise<ApiTestExecution[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiTestExecution[]>(`/test-executions${qs}`);
}

export function fetchTestExecution(id: string): Promise<ApiTestExecution> {
  return apiFetch<ApiTestExecution>(`/test-executions/${id}`);
}

export function createTestExecution(
  data: CreateTestExecutionPayload,
): Promise<ApiTestExecution> {
  return apiFetch<ApiTestExecution>('/test-executions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTestExecution(
  id: string,
  data: UpdateTestExecutionPayload,
): Promise<ApiTestExecution> {
  return apiFetch<ApiTestExecution>(`/test-executions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTestExecution(id: string): Promise<void> {
  return apiFetch<void>(`/test-executions/${id}`, { method: 'DELETE' });
}
