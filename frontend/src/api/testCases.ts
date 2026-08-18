import { apiFetch } from './client';
import type { ApiTestCase, CreateTestCasePayload, UpdateTestCasePayload } from '../types/testCase';

export function fetchTestCases(productId?: string): Promise<ApiTestCase[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiTestCase[]>(`/test-cases${qs}`);
}

export function fetchTestCase(id: string): Promise<ApiTestCase> {
  return apiFetch<ApiTestCase>(`/test-cases/${id}`);
}

export function createTestCase(data: CreateTestCasePayload): Promise<ApiTestCase> {
  return apiFetch<ApiTestCase>('/test-cases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTestCase(id: string, data: UpdateTestCasePayload): Promise<ApiTestCase> {
  return apiFetch<ApiTestCase>(`/test-cases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTestCase(id: string): Promise<void> {
  return apiFetch<void>(`/test-cases/${id}`, { method: 'DELETE' });
}
