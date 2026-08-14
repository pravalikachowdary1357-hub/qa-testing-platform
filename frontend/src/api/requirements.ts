import { apiFetch } from './client';
import type {
  ApiRequirement,
  CreateRequirementPayload,
  UpdateRequirementPayload,
} from '../types/requirement';

export function fetchRequirements(): Promise<ApiRequirement[]> {
  return apiFetch<ApiRequirement[]>('/requirements');
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
