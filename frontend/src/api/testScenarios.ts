import { apiFetch } from './client';
import type {
  ApiTestScenario,
  CreateTestScenarioPayload,
  UpdateTestScenarioPayload,
} from '../types/testScenario';

export function fetchTestScenarios(): Promise<ApiTestScenario[]> {
  return apiFetch<ApiTestScenario[]>('/test-scenarios');
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
