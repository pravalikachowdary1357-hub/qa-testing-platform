import { apiFetch } from './client';
import type {
  ApiRelease,
  CreateReleasePayload,
  SignOffReleasePayload,
  UpdateReleasePayload,
} from '../types/release';

export function fetchReleases(productId?: string): Promise<ApiRelease[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiRelease[]>(`/releases${qs}`);
}

export function fetchRelease(id: string): Promise<ApiRelease> {
  return apiFetch<ApiRelease>(`/releases/${id}`);
}

export function createRelease(data: CreateReleasePayload): Promise<ApiRelease> {
  return apiFetch<ApiRelease>('/releases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRelease(id: string, data: UpdateReleasePayload): Promise<ApiRelease> {
  return apiFetch<ApiRelease>(`/releases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRelease(id: string): Promise<void> {
  return apiFetch<void>(`/releases/${id}`, { method: 'DELETE' });
}

export function signOffRelease(id: string, data: SignOffReleasePayload): Promise<ApiRelease> {
  return apiFetch<ApiRelease>(`/releases/${id}/sign-off`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
