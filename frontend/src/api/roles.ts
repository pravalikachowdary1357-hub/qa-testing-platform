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
