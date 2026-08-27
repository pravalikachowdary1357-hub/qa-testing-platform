import { apiFetch, apiUpload } from './client';
import type {
  ApiTestScenario,
  CreateTestScenarioPayload,
  UpdateTestScenarioPayload,
} from '../types/testScenario';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchTestScenarios(productId?: string): Promise<ApiTestScenario[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiTestScenario[]>(`/test-scenarios${qs}`);
}

export function fetchTestScenario(id: string): Promise<ApiTestScenario> {
  return apiFetch<ApiTestScenario>(`/test-scenarios/${id}`);
}

export function createTestScenario(data: CreateTestScenarioPayload): Promise<ApiTestScenario> {
  return apiFetch<ApiTestScenario>('/test-scenarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTestScenario(
  id: string,
  data: UpdateTestScenarioPayload,
): Promise<ApiTestScenario> {
  return apiFetch<ApiTestScenario>(`/test-scenarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTestScenario(id: string): Promise<void> {
  return apiFetch<void>(`/test-scenarios/${id}`, { method: 'DELETE' });
}

export function importTestScenarios(
  productId: string,
  file: File,
): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>(
    `/test-scenarios/import?productId=${productId}`,
    formData,
  );
}
