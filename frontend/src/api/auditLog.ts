import { apiFetch } from './client';
import type { ApiAuditLogEntry } from '../types/settings';

export function fetchAuditLog(entityType?: string): Promise<ApiAuditLogEntry[]> {
  const qs = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return apiFetch<ApiAuditLogEntry[]>(`/audit-log${qs}`);
}
