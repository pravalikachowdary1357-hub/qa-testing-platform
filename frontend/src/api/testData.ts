import { apiFetch, apiUpload } from './client';
import type {
  ApiTestData,
  ApiTestDataListItem,
  CreateTestDataPayload,
  UpdateTestDataPayload,
} from '../types/testData';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchTestDataList(productId?: string): Promise<ApiTestDataListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiTestDataListItem[]>(`/test-data${qs}`);
}

export function fetchTestDataById(id: string): Promise<ApiTestData> {
  return apiFetch<ApiTestData>(`/test-data/${id}`);
}

export function createTestData(data: CreateTestDataPayload): Promise<ApiTestData> {
  return apiFetch<ApiTestData>('/test-data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTestData(id: string, data: UpdateTestDataPayload): Promise<ApiTestData> {
  return apiFetch<ApiTestData>(`/test-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTestData(id: string): Promise<void> {
  return apiFetch<void>(`/test-data/${id}`, { method: 'DELETE' });
}

export function importTestData(file: File): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>('/test-data/import', formData);
}
