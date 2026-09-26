import { apiFetch } from './client';
import type { ApiPermission, ApiRole } from '../types/settings';

export function fetchRoles(): Promise<ApiRole[]> {
  return apiFetch<ApiRole[]>('/roles');
}

export function fetchPermissionCatalog(): Promise<ApiPermission[]> {
  return apiFetch<ApiPermission[]>('/permissions');
}

export function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<ApiRole> {
  return apiFetch<ApiRole>(`/roles/${roleId}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissionIds }),
  });
}

export function createRole(data: {
  name: string;
  description?: string;
  permissionIds: string[];
}): Promise<ApiRole> {
  return apiFetch<ApiRole>('/roles', { method: 'POST', body: JSON.stringify(data) });
}

export function updateRoleDetails(
  roleId: string,
  data: { name?: string; description?: string },
): Promise<ApiRole> {
  return apiFetch<ApiRole>(`/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteRole(roleId: string): Promise<void> {
  return apiFetch<void>(`/roles/${roleId}`, { method: 'DELETE' });
}
