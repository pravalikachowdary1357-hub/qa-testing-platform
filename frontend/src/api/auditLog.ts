import { apiFetch } from './client';
import type { ApiAuditLogEntry } from '../types/settings';

export function fetchAuditLog(entityType?: string): Promise<ApiAuditLogEntry[]> {
  const qs = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return apiFetch<ApiAuditLogEntry[]>(`/audit-log${qs}`);
}

export function logExportEvent(entityType: string, summary: string): Promise<void> {
  return apiFetch<void>('/audit-log/export-event', {
    method: 'POST',
    body: JSON.stringify({ entityType, summary }),
  });
}
