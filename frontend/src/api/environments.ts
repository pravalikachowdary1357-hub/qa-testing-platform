import { apiFetch } from './client';
import type {
  ApiEnvironment,
  CreateEnvironmentPayload,
  UpdateEnvironmentPayload,
} from '../types/environment';

export function fetchEnvironments(): Promise<ApiEnvironment[]> {
  return apiFetch<ApiEnvironment[]>('/environments');
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
