import { apiFetch } from './client';
import type {
  ApiAutomation,
  ApiAutomationListItem,
  ApiAutomationRun,
  CreateAutomationPayload,
  CreateAutomationRunPayload,
  UpdateAutomationPayload,
} from '../types/automation';

export function fetchAutomations(productId?: string): Promise<ApiAutomationListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiAutomationListItem[]>(`/automations${qs}`);
}

export function fetchAutomation(id: string): Promise<ApiAutomation> {
  return apiFetch<ApiAutomation>(`/automations/${id}`);
}

export function createAutomation(data: CreateAutomationPayload): Promise<ApiAutomationListItem> {
  return apiFetch<ApiAutomationListItem>('/automations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAutomation(
  id: string,
  data: UpdateAutomationPayload,
): Promise<ApiAutomationListItem> {
  return apiFetch<ApiAutomationListItem>(`/automations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAutomation(id: string): Promise<void> {
  return apiFetch<void>(`/automations/${id}`, { method: 'DELETE' });
}

export function recordAutomationRun(
  id: string,
  data: CreateAutomationRunPayload,
): Promise<ApiAutomationRun> {
  return apiFetch<ApiAutomationRun>(`/automations/${id}/runs`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
