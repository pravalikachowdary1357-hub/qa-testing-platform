import { apiFetch } from './client';
import type { ApiTestPlan, CreateTestPlanPayload, UpdateTestPlanPayload } from '../types/testPlan';

export function fetchTestPlans(productId?: string): Promise<ApiTestPlan[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiTestPlan[]>(`/test-plans${qs}`);
}

export function fetchTestPlan(id: string): Promise<ApiTestPlan> {
  return apiFetch<ApiTestPlan>(`/test-plans/${id}`);
}

export function createTestPlan(data: CreateTestPlanPayload): Promise<ApiTestPlan> {
  return apiFetch<ApiTestPlan>('/test-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTestPlan(id: string, data: UpdateTestPlanPayload): Promise<ApiTestPlan> {
  return apiFetch<ApiTestPlan>(`/test-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTestPlan(id: string): Promise<void> {
  return apiFetch<void>(`/test-plans/${id}`, { method: 'DELETE' });
}
