import { apiFetch } from './client';
import type { ApiSprint, CreateSprintPayload } from '../types/sprint';

export function fetchSprints(productId: string): Promise<ApiSprint[]> {
  return apiFetch<ApiSprint[]>(`/sprints?productId=${productId}`);
}

export function createSprint(data: CreateSprintPayload): Promise<ApiSprint> {
  return apiFetch<ApiSprint>('/sprints', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteSprint(id: string): Promise<void> {
  return apiFetch<void>(`/sprints/${id}`, { method: 'DELETE' });
}
