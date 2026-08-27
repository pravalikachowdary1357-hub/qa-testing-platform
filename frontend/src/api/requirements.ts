import { apiFetch, apiUpload } from './client';
import type {
  ApiRequirement,
  CreateRequirementPayload,
  UpdateRequirementPayload,
} from '../types/requirement';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchRequirements(productId?: string): Promise<ApiRequirement[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiRequirement[]>(`/requirements${qs}`);
}

export function fetchRequirement(id: string): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>(`/requirements/${id}`);
}

export function createRequirement(
  data: CreateRequirementPayload,
): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>('/requirements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRequirement(
  id: string,
  data: UpdateRequirementPayload,
): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>(`/requirements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRequirement(id: string): Promise<void> {
  return apiFetch<void>(`/requirements/${id}`, { method: 'DELETE' });
}

export function importRequirements(
  productId: string,
  file: File,
): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>(
    `/requirements/import?productId=${productId}`,
    formData,
  );
}
