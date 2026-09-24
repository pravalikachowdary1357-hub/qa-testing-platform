import { apiDownload, apiFetch, apiUpload } from './client';
import type {
  ApiOrganization,
  ApiOrganizationDetail,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from '../types/organization';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchOrganizations(): Promise<ApiOrganization[]> {
  return apiFetch<ApiOrganization[]>('/organizations');
}

export function fetchOrganization(id: string): Promise<ApiOrganizationDetail> {
  return apiFetch<ApiOrganizationDetail>(`/organizations/${id}`);
}

export function createOrganization(
  data: CreateOrganizationPayload,
): Promise<ApiOrganization> {
  return apiFetch<ApiOrganization>('/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOrganization(
  id: string,
  data: UpdateOrganizationPayload,
): Promise<ApiOrganization> {
  return apiFetch<ApiOrganization>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteOrganization(id: string): Promise<void> {
  return apiFetch<void>(`/organizations/${id}`, { method: 'DELETE' });
}

export function importOrganizations(file: File): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>('/organizations/import', formData);
}

export function fetchOrganizationLogo(id: string): Promise<Blob> {
  return apiDownload(`/organizations/${id}/logo`);
}

export function uploadOrganizationLogo(id: string, file: File): Promise<ApiOrganization> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ApiOrganization>(`/organizations/${id}/logo`, formData);
}

export function deleteOrganizationLogo(id: string): Promise<ApiOrganization> {
  return apiFetch<ApiOrganization>(`/organizations/${id}/logo`, { method: 'DELETE' });
}
