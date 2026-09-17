import { apiFetch } from './client';
import type { ApiBuild, CreateBuildPayload } from '../types/build';

export function fetchBuilds(productId: string): Promise<ApiBuild[]> {
  return apiFetch<ApiBuild[]>(`/builds?productId=${productId}`);
}

export function createBuild(data: CreateBuildPayload): Promise<ApiBuild> {
  return apiFetch<ApiBuild>('/builds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteBuild(id: string): Promise<void> {
  return apiFetch<void>(`/builds/${id}`, { method: 'DELETE' });
}
