import { apiFetch } from './client';
import type { ApiUser, CreateUserPayload, UpdateUserPayload } from '../types/settings';

export interface ListUsersFilter {
  search?: string;
  roleId?: string;
  status?: string;
  organizationId?: string;
}

export function fetchUsers(filter: ListUsersFilter = {}): Promise<ApiUser[]> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.roleId) params.set('roleId', filter.roleId);
  if (filter.status) params.set('status', filter.status);
  if (filter.organizationId) params.set('organizationId', filter.organizationId);
  const qs = params.toString();
  return apiFetch<ApiUser[]>(`/users${qs ? `?${qs}` : ''}`);
}

export function createUser(data: CreateUserPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: UpdateUserPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateOwnProfile(data: {
  name?: string;
  emailNotificationsEnabled?: boolean;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}
