import { apiFetch, apiUpload } from './client';
import type {
  ApiEnvironment,
  CreateEnvironmentPayload,
  UpdateEnvironmentPayload,
} from '../types/environment';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchEnvironments(productId?: string): Promise<ApiEnvironment[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiEnvironment[]>(`/environments${qs}`);
}

export function fetchEnvironment(id: string): Promise<ApiEnvironment> {
  return apiFetch<ApiEnvironment>(`/environments/${id}`);
}

export function createEnvironment(data: CreateEnvironmentPayload): Promise<ApiEnvironment> {
  return apiFetch<ApiEnvironment>('/environments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateEnvironment(
  id: string,
  data: UpdateEnvironmentPayload,
): Promise<ApiEnvironment> {
  return apiFetch<ApiEnvironment>(`/environments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteEnvironment(id: string): Promise<void> {
  return apiFetch<void>(`/environments/${id}`, { method: 'DELETE' });
}

export function importEnvironments(
  productId: string,
  file: File,
): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>(
    `/environments/import?productId=${productId}`,
    formData,
  );
}
