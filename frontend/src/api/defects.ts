import { apiFetch } from './client';
import type { ApiDefect, CreateDefectPayload, UpdateDefectPayload } from '../types/defect';

export function fetchDefects(productId?: string): Promise<ApiDefect[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiDefect[]>(`/defects${qs}`);
}

export function fetchDefect(id: string): Promise<ApiDefect> {
  return apiFetch<ApiDefect>(`/defects/${id}`);
}

export function createDefect(data: CreateDefectPayload): Promise<ApiDefect> {
  return apiFetch<ApiDefect>('/defects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateDefect(id: string, data: UpdateDefectPayload): Promise<ApiDefect> {
  return apiFetch<ApiDefect>(`/defects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteDefect(id: string): Promise<void> {
  return apiFetch<void>(`/defects/${id}`, { method: 'DELETE' });
}
