import { apiFetch } from './client';
import type {
  ApiOrganization,
  ApiOrganizationDetail,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from '../types/organization';

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
