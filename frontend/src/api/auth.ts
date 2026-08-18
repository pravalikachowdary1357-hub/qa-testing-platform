import { apiFetch } from './client';
import type { ApiCurrentUser, ApiSession, LoginResponse } from '../types/auth';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function fetchCurrentUser(): Promise<ApiCurrentUser> {
  return apiFetch<ApiCurrentUser>('/auth/me');
}

export function fetchSessions(): Promise<ApiSession[]> {
  return apiFetch<ApiSession[]>('/auth/sessions');
}

export function revokeSession(id: string): Promise<void> {
  return apiFetch<void>(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
