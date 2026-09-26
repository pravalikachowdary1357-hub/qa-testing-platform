import { apiFetch } from './client';
import type { ApiAuditLogEntry } from '../types/settings';

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export function fetchAuditLog(filters: AuditLogFilters | string = {}): Promise<ApiAuditLogEntry[]> {
  const f = typeof filters === 'string' ? { entityType: filters } : filters;
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return apiFetch<ApiAuditLogEntry[]>(`/audit-log${qs ? `?${qs}` : ''}`);
}

export function fetchAuditLogFacets(): Promise<{ entityTypes: string[]; actions: string[]; total: number }> {
  return apiFetch('/audit-log/facets');
}

export function logExportEvent(entityType: string, summary: string): Promise<void> {
  return apiFetch<void>('/audit-log/export-event', {
    method: 'POST',
    body: JSON.stringify({ entityType, summary }),
  });
}
