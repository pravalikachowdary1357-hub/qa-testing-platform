import { apiFetch, apiUpload } from './client';
import type {
  ApiTestPlan,
  CreateTestPlanPayload,
  TestPlanReviewDecision,
  TestPlanSummaryReport,
  UpdateTestPlanPayload,
} from '../types/testPlan';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

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

export function importTestPlans(
  productId: string,
  file: File,
): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>(
    `/test-plans/import?productId=${productId}`,
    formData,
  );
}

export function reviewTestPlan(
  id: string,
  decision: TestPlanReviewDecision,
  comment?: string,
): Promise<ApiTestPlan> {
  return apiFetch<ApiTestPlan>(`/test-plans/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, ...(comment ? { comment } : {}) }),
  });
}

export function completeTestPlan(
  id: string,
  summary: string,
  comment?: string,
): Promise<ApiTestPlan> {
  return apiFetch<ApiTestPlan>(`/test-plans/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ summary, ...(comment ? { comment } : {}) }),
  });
}

export function fetchTestPlanSummaryReport(id: string): Promise<TestPlanSummaryReport> {
  return apiFetch<TestPlanSummaryReport>(`/test-plans/${id}/summary-report`);
}
